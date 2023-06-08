# Comment to Pull Request using OpenAI's GPT API
This GitHub Action adds a comment to a pull request when it is opened, reopened, or synchronized. The comment includes an explanation of changes generated using OpenAI's GPT API.

## Usage
To use this action, include the following YAML and python code in your repository:

```bash
  .github/workflows/chat-gpt-comment-update.yml
  
  src/sgenerate_explanation.py
```

## Inputs
This action does not have any inputs.

## Outputs
This action does not have any outputs.

## Secrets
This action requires the following secrets:

- GITHUB_TOKEN: A token for the GitHub API with the repo scope.
- OPENAI_API_KEY: An API key for OpenAI's GPT API.

## License
This action is licensed under the MIT License.
