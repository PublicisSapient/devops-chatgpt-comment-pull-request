/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 450:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 177:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 243:
/***/ ((module) => {

module.exports = eval("require")("@octokit/rest");


/***/ }),

/***/ 645:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ }),

/***/ 175:
/***/ ((module) => {

module.exports = eval("require")("gpt-3-encoder");


/***/ }),

/***/ 903:
/***/ ((module) => {

module.exports = eval("require")("openai");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const axios = __nccwpck_require__(645);
const core = __nccwpck_require__(450);
const { encode, decode } = __nccwpck_require__(175);
const { Configuration, OpenAIApi } = __nccwpck_require__(903);
const { Octokit } = __nccwpck_require__(243);
const { context: githubContext } = __nccwpck_require__(177);

const openai = new OpenAIApi(new Configuration({
  apiKey: core.getInput('open-api-key')
}));

async function generateExplanation(changes) {
  const encodedDiff = encode(JSON.stringify(changes));
  const totalTokens = encodedDiff.length;

  const model = core.getInput('model');
  const temperature = parseInt(core.getInput('temperature'));
  const maxResponseTokens = parseInt(core.getInput('max-response-tokens'));
  const topP = parseInt(core.getInput('top_p'));
  const frequencyPenalty = parseInt(core.getInput('frequency-penalty'));
  const presencePenalty = parseInt(core.getInput('presence-penalty'));
  const segmentSize = parseInt(core.getInput('segment-size'));

  console.log('model = ' + model);
  console.log('temperature = ' + temperature);
  console.log('max_tokens = ' + maxResponseTokens);
  console.log('top_p = ' + topP);
  console.log('frequency_penalty = ' + frequencyPenalty);
  console.log('presence_penalty = ' + presencePenalty);
  console.log('Segment Size = ' + segmentSize);

  function splitStringIntoSegments(encodedDiff, totalTokens, segmentSize) {
    const segments = [];

    for (let i = 0; i < totalTokens; i += segmentSize) {
      segments.push(encodedDiff.slice(i, i + segmentSize));
    }
    return segments;
  }

  const segments = splitStringIntoSegments(encodedDiff, totalTokens, segmentSize);

  for (let i = 0; i < segments.length; i++) {
    const obj = decode(segments[i]);
    const part = i + 1;
    const totalParts = segments.length;
    console.log('Segment Tokens:', encode(JSON.stringify(obj)).length);
    console.log(`This is part ${part} of ${totalParts}`);

    let prompt;
    if (part !== totalParts) {
      prompt = `This is part ${part} of ${totalParts}. Just receive and acknowledge as Part ${part}/${totalParts} \n\n${obj}`;
    } else {
      const customPrompt = core.getInput('custom-prompt');
      prompt = `This is part ${part} of ${totalParts}. ${customPrompt}\n\n${obj}`;
    }

    console.log(prompt);
    const response = await openai.createChatCompletion({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxResponseTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty
    });

    if (part === totalParts) {
      const explanation = response.data.choices[0].message.content.trim();
      return explanation;
    }
  }
}

async function getParentSha(url, headers) {
  const response = await axios.get(url, { headers: headers });
  const baseCommitSha = response.data.commit.parents[0].sha;
  console.log(baseCommitSha);
  return baseCommitSha;
}

try {
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  const jsonData = JSON.parse(payload);
  const pullRequestNumber = jsonData.number;
  const repository = jsonData.pull_request.base.repo.full_name;
  const token = core.getInput('github-token');

  const pullRequestUrl = `https://api.github.com/repos/${repository}/pulls/${pullRequestNumber}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`
  };

  axios.get(pullRequestUrl, { headers: headers })
    .then(async (response) => {
      const pullRequestData = response.data;
      const numComments = pullRequestData.comments;
      const headCommitSha = pullRequestData.head.sha;

      console.log('Number of Comments:', numComments);
      console.log('Head Sha:', headCommitSha);
      console.log('PR URL:', pullRequestUrl);
      console.log('PR Headers', headers);

      let baseCommitSha;
      if (numComments === 0) {
        console.log('Number of Comments is 0');
        console.log('Compare against base sha');
        baseCommitSha = pullRequestData.base.sha;
      } else {
        console.log('Number of Comments is NOT 0');
        console.log('Compare against parent sha');
        const pullRequestBranch = pullRequestData.head.ref;
        const branchRequestUrl = `https://api.github.com/repos/${repository}/branches/${pullRequestBranch}`;
        baseCommitSha = await getParentSha(branchRequestUrl, headers);
      }

      console.log('Head Commit:', headCommitSha);
      console.log('Base Commit:', baseCommitSha);

      const commitUrl = `https://api.github.com/repos/${repository}/commits/`;
      const baseCommitUrl = commitUrl + baseCommitSha;
      const headCommitUrl = commitUrl + headCommitSha;

      return Promise.all([
        axios.get(baseCommitUrl, { headers: headers }),
        axios.get(headCommitUrl, { headers: headers })
      ]);
    })
    .then(([baseCommitResponse, headCommitResponse]) => {
      const baseCommitData = baseCommitResponse.data;
      const headCommitData = headCommitResponse.data;

      const compareUrl = `https://api.github.com/repos/${repository}/compare/${baseCommitData.sha}...${headCommitData.sha}`;
      return axios.get(compareUrl, { headers: headers });
    })
    .then((compareResponse) => {
      const compareData = compareResponse.data;
      const changes = compareData.files;

      const tokens = encode(JSON.stringify(changes)).length;
      const maxPromptTokens = core.getInput('max-prompt-tokens');

      console.log('Prompt Token Count:', tokens);
      console.log('Max Prompt Tokens: ', maxPromptTokens);

      const ignorePathsInput = core.getInput('ignore-paths');
      const ignorePaths = ignorePathsInput ? ignorePathsInput.split(',') : [];

      function shouldIgnore(path) {
        return ignorePaths.some(ignorePath => {
          const trimmedIgnorePath = ignorePath.trim();

          if (trimmedIgnorePath.endsWith('/')) {
            return path.startsWith(trimmedIgnorePath);
          } else if (trimmedIgnorePath.endsWith('*')) {
            const prefix = trimmedIgnorePath.slice(0, -1);
            return path.startsWith(prefix);
          } else {
            return path === trimmedIgnorePath;
          }
        });
      }

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
      console.log(explanation.split('-').join('\n'));

      if (explanation !== 'skipping comment') {
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

        createComment();
      } else {
        console.log('Skipping Comment due to Max Tokens or No Changes after Filtering');
      }
    })
    .catch((error) => {
      console.error(error);
    });
} catch (error) {
  core.setFailed(error.message);
}
})();

module.exports = __webpack_exports__;
/******/ })()
;