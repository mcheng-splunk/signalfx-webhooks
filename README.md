# CircleCI webhooks sample

- `npm install`

- `npm run start` (use ngrok or deploy somewhere nice - note the deployment URL)

- pass the publicly accessible url: `https://your-app.example.com/v1/cicd/ci-webhook` into webhooks setting in CircleCI
- Open the web app


- Create a .env file and provide the following values
  1.  SIGNALFX_REGION=<SIGNALFX_REGION>
  2. SIGNALFX_TOKEN=<SIGNALFX_TOKEN>
  3. PORT=5000

