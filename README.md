# Explanation Generator using ChatGPT

This repository contains a Github action that generates explanations of changes using the OpenAI API. It analyzes the differences between two commits in a pull request and provides a summary of the changes.

# API UML diagram

![image](https://github.com/ps-aartread-org/chatgpt-comment-pull-request/assets/56265677/4aeef9d6-7284-409d-9ef9-cbc142d1c3de)


## Prerequisites

Before running this, ensure you have the following:

- An OpenAI API key.
- A GitHub personal access token.


## Usage

```yml
      - name: ChatGpt Comment
        uses: ps-aartread-org/chatgpt-comment-pull-request@main
```

This action will retrieve the pull request information and generate an explanation of the changes using the OpenAI API. If the explanation exceeds the maximum token limit or there are no changes after filtering, a comment will not be created.

## Action inputs

| Name | Description | Default | Required |
| --- | --- | --- | --- |
| `github-token` | `GITHUB_TOKEN` (permissions `contents: write` and `pull-requests: write`) or a `repo` scoped [Personal Access Token (PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). | `GITHUB_TOKEN` | true |
| `open-api-key` | OPENAI API Token created from https://platform.openai.com/account/api-keys. | `CHATGPT_API_KEY` | true |
| `max-prompt-tokens` | The max-prompt-tokens variable is used to limit the number of tokens that are sent to OpenAI when generating an explanation of the changes in a pull request. The default value of 256 is used. | `256` | false |
| `ignore-paths` | Comma separated list of paths and files those needs to be ignored from explanation | `All files are scanned if nothing is provided` | false |

## Configuration

Action provides several configuration options that you can modify based on your requirements:

- `apiKey`: Your OpenAI API key.
- `github-token`: Your GitHub personal access token.
- `max-prompt-tokens`: The maximum number of tokens allowed in the prompt.
- `ignore-paths`: Comma-separated list of file paths or patterns to ignore.
- `model`: The OpenAI language model to use for generating explanations.

## Reference Example

The following workflow sets many of the action's inputs for reference purposes.
Check the [defaults](#action-inputs) to avoid setting inputs unnecessarily.

See below for the use cases.

```yml
on:
  pull_request:
    branches:
      - main
  workflow_dispatch:

jobs:
  chatgptComment:
    runs-on: ubuntu-latest
    name: Add Comment
    steps:
      - name: Add Comment
        uses: ps-aartread-org/chatgpt-comment-pull-request@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          open-api-key: ${{ secrets.CHATGPT_API_KEY }}
          max-prompt-tokens: '50000'
          ignore-paths: '.github/*, src/, package*.json, .env*'
```

An example based on the above reference configuration adds comment that look like this:

<img width="961" alt="image" src="https://github.com/ps-aartread-org/chatgpt-comment-pull-request/assets/56265677/729f6d2b-3d2c-4549-b37b-fbb8c411aec4">


## License

This project is licensed under the [MIT License](LICENSE).

## Contributions

Contributions to this project are welcome. Feel free to open issues or submit pull requests to improve the script.

## Credits

This script utilizes the following packages and libraries:

- axios
- @actions/core
- @actions/github
- gpt-3-encoder
- openai
- @octokit/rest
