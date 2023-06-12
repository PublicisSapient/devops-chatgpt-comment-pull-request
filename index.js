// const openai = require('openai');
const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');

const { encode, decode } = require('gpt-3-encoder')

const { Configuration, OpenAIApi } = require("openai");

const { Octokit } = require('@octokit/rest');
const { context: githubContext } = require('@actions/github');

const configuration = new Configuration({
  apiKey: core.getInput('open-api-key')
});
const openai = new OpenAIApi(configuration);


// Function to generate the explaination of the changes using open api.
async function generate_explanation(changes) {
  const diff = JSON.stringify(changes)
  const prompt = `Given the below diff. Summarize the changes in 200 words or less:\n\n${diff}`;

  // console.log('The Prompt')
  // console.log(JSON.stringify(prompt))

  const response = await openai.createCompletion({
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

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  const jsonData = JSON.parse(payload);

  const pull_request_number = jsonData.number;
  const repository = jsonData.pull_request.base.repo.full_name;
  const token = core.getInput('github-token');

  console.log(`The PR Number: ${pull_request_number}`);
  console.log(`Repository: ${repository}`);

  const pull_request_url = `https://api.github.com/repos/${repository}/pulls/${pull_request_number}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
  };

  axios
    .get(pull_request_url, { headers: headers })
    .then((response) => {
      const pull_request_data = response.data;
      // console.log(response.data);

      const base_commit_sha = pull_request_data.base.sha;
      const head_commit_sha = pull_request_data.head.sha;

      const commit_url = `https://api.github.com/repos/${repository}/commits/`;
      const base_commit_url = commit_url + base_commit_sha;
      const head_commit_url = commit_url + head_commit_sha;

      return Promise.all([
        axios.get(base_commit_url, { headers: headers }),
        axios.get(head_commit_url, { headers: headers }),
      ]);
    })
    .then(([baseCommitResponse, headCommitResponse]) => {
      const base_commit_data = baseCommitResponse.data;
      const head_commit_data = headCommitResponse.data;

      console.log('Base Sha');
      console.log(baseCommitResponse.data.sha);
      console.log('Head Sha');
      console.log(headCommitResponse.data.sha);

      const compare_url = `https://api.github.com/repos/${repository}/compare/${base_commit_data.sha}...${head_commit_data.sha}`;
      return axios.get(compare_url, { headers: headers });
    })
    .then((compareResponse) => {
      const compare_data = compareResponse.data;
      const changes = compare_data.files;

      const tokens = encode(JSON.stringify(changes)).length;
      const inputString = encode(JSON.stringify(changes));
      const max_prompt_tokens = core.getInput('max-prompt-tokens');
      console.log('Prompt Token Count:', tokens);
      console.log('Max Prompt Tokens: ', max_prompt_tokens);

      function splitStringIntoSegments(inputString, totalTokens, segmentSize = 4096) {
        const segments = [];

        for ( let i=0; i < totalTokens; i += segmentSize) {
          segments.push(inputString.slice(i, i + segmentSize));
        }
        return segments;
      }

      const segments = splitStringIntoSegments(inputString, tokens);
      console.log(segments);

      for (let i = 0; i < segments.length; i++) {
        let obj = segments[i]
        console.log('File Tokens:', encode(JSON.stringify(obj)).length)
        console.log(obj);
      }

      // if (tokens > max_prompt_tokens) {
      //   console.log(`The number of prompt tokens ${tokens} has exceeded the maximum allowed ${max_prompt_tokens}`)
      //   const explanation = 'skipping comment';
      //   return explanation 
      // } else if (tokens + 256 > 4096) {
      //   console.log('Splitting Requests');
      //   for (let i = 0; i < changes.length; i++) {
      //     let obj = changes[i]
      //     console.log('File Tokens:', encode(JSON.stringify(obj)).length)
      //     console.log(obj);
      //   }
      //   // console.log(changes);

      // } else {
      //   // return generate_explanation(changes);
      // }
    })
    // .then((explanation) => {
    //   console.log(explanation.split('-').join('\n'));

      // const octokit = new Octokit({ auth: token });
      // const comment = `Explanation of Changes (Generated via OpenAI):\n\n${JSON.stringify(explanation)}`;
      // async function create_comment() {
      //   const newComment = await octokit.issues.createComment({
      //     ...githubContext.repo,
      //     issue_number: githubContext.issue.number,
      //     body: comment
      //   });
      
      //   console.log(`Comment added: ${newComment.data.html_url}`);
      // }

      // if ( explanation == 'skipping comment') {
      //   console.log('Skipping Comment due to Max Tokens')
      // } else {
      //   create_comment();
      // }
    // })
    .catch((error) => {
      console.error(error);
    });

} catch (error) {
  core.setFailed(error.message);
}