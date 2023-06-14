// Import required packages and libraries
const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');
const { encode, decode } = require('gpt-3-encoder')

const { Configuration, OpenAIApi } = require("openai");
const { Octokit } = require('@octokit/rest');
const { context: githubContext } = require('@actions/github');

// Create an OpenAI instance using the provided API key
const configuration = new Configuration({
  apiKey: core.getInput('open-api-key')
});
const openai = new OpenAIApi(configuration);

// Function to generate the explanation of the changes using OpenAI API
async function generateExplanation(changes) {
  const encodedDiff = encode(JSON.stringify(changes));
  const totalTokens = encode(JSON.stringify(changes)).length;

  // Function to split the incoming changes into smaller chunks.
  function splitStringIntoSegments(encodedDiff, totalTokens, segmentSize = 3096) {
    const segments = [];

    for (let i = 0; i < totalTokens; i += segmentSize) {
      segments.push(encodedDiff.slice(i, i + segmentSize));
    }
    return segments;
  }

  const segments = splitStringIntoSegments(encodedDiff, totalTokens);

  // Loop through each segment and send the request to OpenAI.
  // If the segment is not the last segment, just receive and acknowledge. Otherwise, return the response.
  for (let i = 0; i < segments.length; i++) {
    let obj = decode(segments[i]);
    let part = i + 1;
    let totalParts = segments.length;
    console.log('Segment Tokens:', encode(JSON.stringify(obj)).length);
    console.log(`This is part ${part} of ${totalParts}`);

    let model = core.getInput('model');
    let temperature = parseInt(core.getInput('temperature'));
    let maxResponseTokens = parseInt(core.getInput('max-response-tokens'));
    let topP = parseInt(core.getInput('top_p'));
    let frequencyPenalty = parseInt(core.getInput('frequency-penalty'));
    let presencePenalty = parseInt(core.getInput('presence-penalty'));
    console.log('model = '+ model);
    console.log('temperature = '+ temperature);
    console.log('max_tokens = '+maxResponseTokens);
    console.log('top_p = '+ topP);
    console.log('frequency_penalty = '+ frequencyPenalty);
    console.log('presence_penalty = '+ presencePenalty);

    if (part != totalParts) {
      let prompt = `This is part ${part} of ${totalParts}. Just receive and acknowledge as Part ${part}/${totalParts} \n\n${obj}`;
      console.log(prompt);

      await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt }],
      });

      // await openai.createChatCompletion({
      //   model: model,
      //   prompt: prompt,
      //   temperature: temperature,
      //   max_tokens: maxResponseTokens,
      //   // top_p: topP,
      //   // frequency_penalty: frequencyPenalty,
      //   // presence_penalty: presencePenalty,
      // });
    } else {
      let customPrompt = core.getInput('custom-prompt');
      let prompt = `This is part ${part} of ${totalParts}. ${customPrompt}\n\n${obj}`;
      console.log(prompt);

      let response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt }],
      });

      console.log(response.data.choices[0].message)

      // let response = await openai.createChatCompletion({
      //   model: model,
      //   prompt: prompt,
      //   temperature: temperature,
      //   max_tokens: maxResponseTokens,
      //   // top_p: topP,
      //   // frequency_penalty: frequencyPenalty,
      //   // presence_penalty: presencePenalty,
      // });

      const explanation = response.data.choices[0].message.trim();
      return explanation;
    }
  }
}

// Function to Get Parent SHA from Branch
async function getParentSha(url, headers) {

  let response = await axios.get(url, {headers: headers });

  const baseCommitSha = response.data.commit.parents[0].sha;
  console.log(baseCommitSha);
  return baseCommitSha;

}

try {
  // Get the PR number, repository, and token from the GitHub webhook payload
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  const jsonData = JSON.parse(payload);
  const pullRequestNumber = jsonData.number;
  const repository = jsonData.pull_request.base.repo.full_name;
  const token = core.getInput('github-token');

  // Retrieve the base and head commit information for the pull request
  const pullRequestUrl = `https://api.github.com/repos/${repository}/pulls/${pullRequestNumber}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
  };

  axios.get(pullRequestUrl, { headers: headers })
    .then((response) => {

      // Set Base and Head CommitIDs
      const pullRequestData = response.data;

      return pullRequestData

    })
    .then((pullRequestData) => {
      const numComments = pullRequestData.comments;
      const headCommitSha = pullRequestData.head.sha;

      console.log('Number of Comments:', numComments);
      console.log('Head Sha:', headCommitSha);
      console.log('PR URL:', pullRequestUrl);
      console.log('PR Headers', headers);

      if (numComments == 0) {
        console.log('Number of Comments is 0')
        console.log('Compare against base sha')
        const baseCommitSha = pullRequestData.base.sha;

        return Promise.all([
          headCommitSha,
          baseCommitSha,
        ])
      } else {
        console.log('Number of Comments is NOT 0')
        console.log('Compare against parent sha')
        const pullRequestBranch = pullRequestData.head.ref;
        const branchRequestUrl = `https://api.github.com/repos/${repository}/branches/${pullRequestBranch}`;
        const baseCommitSha = getParentSha(branchRequestUrl, headers);

        return Promise.all([
          headCommitSha,
          baseCommitSha,
        ])
      }

    })
    .then(([headCommitSha, baseCommitSha]) => {
      console.log('Head Commit:', headCommitSha);
      console.log('Base Commit:', baseCommitSha);

      // Retrieve the file changes between the base and head commits
      const commitUrl = `https://api.github.com/repos/${repository}/commits/`;
      const baseCommitUrl = commitUrl + baseCommitSha;
      const headCommitUrl = commitUrl + headCommitSha;

      return Promise.all([
        axios.get(baseCommitUrl, { headers: headers }),
        axios.get(headCommitUrl, { headers: headers }),
      ]);

    })
    .then(([baseCommitResponse, headCommitResponse]) => {
      // Compare the Commit IDs and get a back response in JSON.
      const baseCommitData = baseCommitResponse.data;
      const headCommitData = headCommitResponse.data;

      // Retrieve the diff and changes between the base and head commits
      const compareUrl = `https://api.github.com/repos/${repository}/compare/${baseCommitData.sha}...${headCommitData.sha}`;
      return axios.get(compareUrl, { headers: headers });
    })
    .then((compareResponse) => {
      // Get the data and output the file changes.
      const compareData = compareResponse.data;
      const changes = compareData.files;

      // Calculate the token count of the prompt
      const tokens = encode(JSON.stringify(changes)).length;
      const maxPromptTokens = core.getInput('max-prompt-tokens'); // Maximum prompt tokens allowed

      // Print Prompt Token Count & Max Prompt Tokens
      console.log('Prompt Token Count:', tokens);
      console.log('Max Prompt Tokens: ', maxPromptTokens);

      let ignorePathsInput = core.getInput('ignore-paths');
      let ignorePaths = [];
      if (ignorePathsInput) {
        ignorePaths = ignorePathsInput.split(',');
      }

      // Function to check if a file or path should be ignored
      function shouldIgnore(path) {
        return ignorePaths.some(ignorePath => {
          const trimmedIgnorePath = ignorePath.trim();

          if (trimmedIgnorePath.endsWith('/')) {
            // Directory path
            return path.startsWith(trimmedIgnorePath);
          } else if (trimmedIgnorePath.endsWith('*')) {
            // Wildcard file name
            const prefix = trimmedIgnorePath.slice(0, -1);
            return path.startsWith(prefix);
          } else {
            // Literal file name
            return path === trimmedIgnorePath;
          }
        });
      }

      // Filter out ignored files and paths
      const filteredChanges = changes.filter(change => !shouldIgnore(change.filename));

      if (tokens > maxPromptTokens || (ignorePathsInput && filteredChanges.length === 0)) {
        console.log('Skipping Comment due to Max Tokens or No Changes after Filtering');
        const explanation = 'skipping comment';
        return explanation;
      } else {
        return generateExplanation(filteredChanges);
      }
    })
    .then((explanation) => {
      // Create the GitHub Comment
      console.log(explanation.split('-').join('\n'));

      // Create a comment with the generated explanation
      const octokit = new Octokit({ auth: token });
      const comment = `Explanation of Changes (Generated via OpenAI):\n\n${JSON.stringify(explanation)}`;

      async function createComment() {
        const newComment = await octokit.issues.createComment({
          ...githubContext.repo,
          issue_number: githubContext.issue.number,
          body: comment
        });

        console.log(`Comment added: ${newComment.data.html_url}`);
      }

      // Create Comment if Explanation does not contain 'skipping comment' due to max tokens limit
      if (explanation == 'skipping comment') {
        console.log('Skipping Comment due to Max Tokens or No Changes after Filtering');
      } else {
        createComment();
      }
    })
    .catch((error) => {
      console.error(error);
    });

} catch (error) {
  core.setFailed(error.message);
}
