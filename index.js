// const openai = require('openai');
const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: core.getInput('open-api-key')
});
const openai = new OpenAIApi(configuration);

// dotenv.config();

// openai.apiKey = process.env.OPENAI_API_KEY;

// async function generate_explanation(changes) {
//   const prompt = `Changes: ${changes}\n\nExplain the changes:`;

//   const response = await openai.Completion.create({
//     engine: 'text-davinci-003',
//     prompt: prompt,
//     max_tokens: 200,
//     temperature: 0.7,
//     n: 1,
//     stop: null,
//     timeout: 30,
//   });

//   const explanation = response.choices[0].text.trim();
//   return explanation;
// }

// const pull_request_number = process.env.PR_NUMBER;
// const repository = process.env.GITHUB_REPOSITORY;
// const token = process.env.GITHUB_TOKEN;

// const pull_request_url = `https://api.github.com/repos/${repository}/pulls/${pull_request_number}`;
// const headers = {
//   Accept: 'application/vnd.github.v3+json',
//   Authorization: `Bearer ${token}`,
// };

// axios
//   .get(pull_request_url, { headers: headers })
//   .then((response) => {
//     const pull_request_data = response.data;

//     const base_commit_sha = pull_request_data.base.sha;
//     const head_commit_sha = pull_request_data.head.sha;

//     const commit_url = `https://api.github.com/repos/${repository}/commits/`;
//     const base_commit_url = commit_url + base_commit_sha;
//     const head_commit_url = commit_url + head_commit_sha;

//     return Promise.all([
//       axios.get(base_commit_url, { headers: headers }),
//       axios.get(head_commit_url, { headers: headers }),
//     ]);
//   })
//   .then(([baseCommitResponse, headCommitResponse]) => {
//     const base_commit_data = baseCommitResponse.data;
//     const head_commit_data = headCommitResponse.data;

//     const compare_url = `https://api.github.com/repos/${repository}/compare/${base_commit_data.sha}...${head_commit_data.sha}`;
//     return axios.get(compare_url, { headers: headers });
//   })
//   .then((compareResponse) => {
//     const compare_data = compareResponse.data;
//     const changes = compare_data.files;

//     return generate_explanation(changes);
//   })
//   .then((explanation) => {
//     console.log(explanation.split('-').join('\n'));
//   })
//   .catch((error) => {
//     console.error(error);
//   });


try {
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  const jsonData = JSON.parse(payload);

  const pull_request_number = jsonData.number;
  const repository = jsonData.pull_request.base.repo.full_name;
  const token = core.getInput('github-token');

  console.log(`The PR Number: ${pull_request_number}`);
  console.log(`Repository: ${repository}`);
  console.log(`Token: ${token}`);

  async function generate_explanation() {
    // const prompt = `Changes: ${changes}\n\nExplain the changes:`;
    const prompt = `How do you do?`;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: "",
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const explanation = response.data.choices[0].text.trim();
    return explanation;
  }

  generate_explanation();

  // const pull_request_url = `https://api.github.com/repos/${repository}/pulls/${pull_request_number}`;
  // const headers = {
  //   Accept: 'application/vnd.github.v3+json',
  //   Authorization: `Bearer ${token}`,
  // };

  // axios
  //   .get(pull_request_url, { headers: headers })
  //   .then((response) => {
  //     const pull_request_data = response.data;
  //     // console.log(response.data);

  //     const base_commit_sha = pull_request_data.base.sha;
  //     const head_commit_sha = pull_request_data.head.sha;

  //     const commit_url = `https://api.github.com/repos/${repository}/commits/`;
  //     const base_commit_url = commit_url + base_commit_sha;
  //     const head_commit_url = commit_url + head_commit_sha;

  //     return Promise.all([
  //       axios.get(base_commit_url, { headers: headers }),
  //       axios.get(head_commit_url, { headers: headers }),
  //     ]);
  //   })
  //   .then(([baseCommitResponse, headCommitResponse]) => {
  //     const base_commit_data = baseCommitResponse.data;
  //     const head_commit_data = headCommitResponse.data;

  //     // console.log('Base Sha');
  //     // console.log(baseCommitResponse.data.sha);
  //     // console.log('Head Sha');
  //     // console.log(headCommitResponse.data.sha);

  //     const compare_url = `https://api.github.com/repos/${repository}/compare/${base_commit_data.sha}...${head_commit_data.sha}`;
  //     return axios.get(compare_url, { headers: headers });
  //   })
  //   .then((compareResponse) => {
  //     const compare_data = compareResponse.data;
  //     const changes = compare_data.files;

  //     // console.log(changes)
  //     return generate_explanation(changes);
  //   })
  //   .then((explanation) => {
  //     console.log(explanation.split('-').join('\n'));
  //   })
  //   .catch((error) => {
  //     console.error(error);
  //   });

} catch (error) {
  core.setFailed(error.message);
}