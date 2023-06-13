# Explanation Generator using ChatGPT

This repository contains a script that generates explanations of changes using the OpenAI API. It analyzes the differences between two commits in a pull request and provides a summary of the changes.

## Prerequisites

Before running this, ensure you have the following:

- An OpenAI API key.
- A GitHub personal access token.

## Installation

   ```
   TBD
   ```

## Usage

   ```
   TBD
   ```

The script will retrieve the pull request information and generate an explanation of the changes using the OpenAI API. If the explanation exceeds the maximum token limit or there are no changes after filtering, a comment will not be created.

## Configuration

The script provides several configuration options that you can modify based on your requirements:

- `apiKey`: Your OpenAI API key.
- `github-token`: Your GitHub personal access token.
- `max-prompt-tokens`: The maximum number of tokens allowed in the prompt.
- `ignore-paths`: Comma-separated list of file paths or patterns to ignore.
- `model`: The OpenAI language model to use for generating explanations.

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
