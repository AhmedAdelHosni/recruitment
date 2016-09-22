var nconf = module.exports = require('nconf');
// var path = require('path');

nconf
  .defaults({
    GCLOUD_PROJECT: "recruitment-app-142905",
    SECRET: "2nfQWU$n)z5WdfyWZ",
    DATA_BACKEND: "mongodb",
    MONGO_URL: "mongodb://cloud11recruitment:1234567890aA@ds011775.mlab.com:11775/recruitment-app",
    OAUTH2_CLIENT_ID: "10175252286-bl3du8bddmnqfecv4h2pk2vn2te0bp3r.apps.googleusercontent.com",
    OAUTH2_CLIENT_SECRET: "x1sPDoAGDlYYa6pkKe5GOt2G",
    OAUTH2_CALLBACK: "http://localhost:8080/auth/google/callback",
    PORT: 8080,
    ADMIN_EMAILS: ["GCP@cloud-11.com","slashhashdash@gmail.com"]
  });