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
async function generate_explanation(changes) {
  const encodedDiff = encode(JSON.stringify(changes));
  const totalTokens = encode(JSON.stringify(changes)).length;
  
  // Function to split the incoming changes into smaller chunks.
  function splitStringIntoSegments(encodedDiff, totalTokens, segmentSize = 3096) {
    const segments = [];

    for ( let i=0; i < totalTokens; i += segmentSize) {
      segments.push(encodedDiff.slice(i, i + segmentSize));
    }
    return segments;
  }

  const segments = splitStringIntoSegments(encodedDiff, totalTokens);

  // Loop through each segment and send the request to openai.
  // If the segment is not the last segment just acknowledge and wait. Otherwise return the response. 
  for (let i = 0; i < segments.length; i++) {
    let obj = decode(segments[i])
    let part = i+1
    let totalparts = segments.length
    console.log('Segment Tokens:', encode(JSON.stringify(obj)).length)
    console.log(`This is part ${part} of ${totalparts}`)

    if (part != totalparts){
      let prompt = `This is part ${part} of ${totalparts}. Just receive and acknowledge as Part ${part}/${totalparts} \n\n${obj}`;
      console.log(prompt);

      await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
    } else {
      let prompt = `This is part ${part} of ${totalparts}. Given the diff of all parts. Summarize the changes in 300 words or less\n\n${obj}`;
      console.log(prompt);
      let response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const explanation = response.data.choices[0].text.trim();
      return explanation;
    }
  }

}

try {
  // Get the PR number, repository, and token from the GitHub webhook payload
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  const jsonData = JSON.parse(payload);
  const pull_request_number = jsonData.number;
  const repository = jsonData.pull_request.base.repo.full_name;
  const token = core.getInput('github-token');

  // Retrieve the base and head commit information for the pull request
  const pull_request_url = `https://api.github.com/repos/${repository}/pulls/${pull_request_number}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
  };

  axios
    .get(pull_request_url, { headers: headers })
    .then((response) => {
      // Set Base and Head CommitIDs
      const pull_request_data = response.data;
      const base_commit_sha = pull_request_data.base.sha;
      const head_commit_sha = pull_request_data.head.sha;

      // Retrieve the file changes between the base and head commits
      const commit_url = `https://api.github.com/repos/${repository}/commits/`;
      const base_commit_url = commit_url + base_commit_sha;
      const head_commit_url = commit_url + head_commit_sha;

      return Promise.all([
        axios.get(base_commit_url, { headers: headers }),
        axios.get(head_commit_url, { headers: headers }),
      ]);
    })
    .then(([baseCommitResponse, headCommitResponse]) => {
      // Compare the Commit IDs and get a back response in JSON.
      const base_commit_data = baseCommitResponse.data;
      const head_commit_data = headCommitResponse.data;

      // Print the base_commit_data & head_commit_data
      console.log('Base Sha');
      console.log(baseCommitResponse.data.sha);
      console.log('Head Sha');
      console.log(headCommitResponse.data.sha);

      // Retrieve the diff and changes between the base and head commits
      const compare_url = `https://api.github.com/repos/${repository}/compare/${base_commit_data.sha}...${head_commit_data.sha}`;
      return axios.get(compare_url, { headers: headers });
    })
    .then((compareResponse) => {
      // Get the Data and output the File Changes.
      const compare_data = compareResponse.data;
      const changes = compare_data.files;

      // Calculate the token count of the prompt
      const tokens = encode(JSON.stringify(changes)).length;
      const max_prompt_tokens = core.getInput('max-prompt-tokens'); // Maximum prompt tokens allowed

      // Print Prompt Token Count & Max Prompt Tokens
      console.log('Prompt Token Count:', tokens);
      console.log('Max Prompt Tokens: ', max_prompt_tokens);

      if (tokens > max_prompt_tokens) {
        console.log(`The number of prompt tokens ${tokens} has exceeded the maximum allowed ${max_prompt_tokens}`)
        const explanation = 'skipping comment';
        return explanation 
      } else {
        return generate_explanation(changes);
      }
    })
    .then((explanation) => {
      // Create the GitHub Comment
      console.log(explanation.split('-').join('\n'));

      // Create a comment with the generated explanation
      const octokit = new Octokit({ auth: token });
      const comment = `Explanation of Changes (Generated via OpenAI):\n\n${JSON.stringify(explanation)}`;

      async function create_comment() {
        const newComment = await octokit.issues.createComment({
          ...githubContext.repo,
          issue_number: githubContext.issue.number,
          body: comment
        });

        console.log(`Comment added: ${newComment.data.html_url}`);
      }

      // Check response token count and create comment if within limit
      if (explanation == 'skipping comment') {
        console.log('Skipping Comment due to Max Tokens');
      } else {
        const maxResponseTokens = core.getInput('max-prompt-tokens'); // Maximum response tokens allowed
        const responseTokens = encode(explanation).length;
        console.log('Response Token Count:', responseTokens);
        console.log('Max Response Tokens:', maxResponseTokens);

        if (responseTokens <= maxResponseTokens) {
          create_comment();
        } else {
          console.log(`The number of response tokens ${responseTokens} has exceeded the maximum allowed ${maxResponseTokens}`);
          console.log('Skipping Comment due to Max Tokens');
        }
      }
    })
    .catch((error) => {
      console.error(error);
    });

} catch (error) {
  core.setFailed(error.message);
}
