## Whats that??
* [Demo](http://sahmudi.com)
* The website allows users to create and modify recruitment forms, with fully customizable fields
 * field type, options, if field is required and file size limit
 * Company Banner image
 * Confirmation email message
 * email footer image
* Once the form is submitted:
 * A folder and a spreadsheet in the user's google drive will be created with the title of the form
* Once the applicant applies using the form:
 * The spreadsheet of the form gets appeneded with a new row
 * A folder for the applicant is created inside the form folder with all uploaded files and a document containing all the applicant submitted information.
 * An email is sent to the applicant to confirm the submission.
 * An email is sent to the recruiter to notify him for a new job application with a link to the google drive folder of the applicant.
* You can allow certain users (admins) specified by their email addresses to view the number of users using the app and number of forms created for each user.

## Setup
* Setup a MongoDB (Demo uses [mlab.com](http://mlab.com))
* Create a google project using the developer console
 * Enable the `Drive`, `Sheets` and `Gmail` APIs
 * Create OAuth Client ID and Service account key
* Create a `config.json` in the project root directory with for the following keys:  

    ```
    {
        "SESSION_SECRET": "<somesecret>",
        "DATA_BACKEND": "mongodb",
        "MONGO_URL": "<someurl>",
        "OAUTH2_CLIENT_ID": "<client ID from the OAuth client ID page>",
        "OAUTH2_CLIENT_SECRET": "<client secret from the OAuth client secret page>",
        "OAUTH2_CALLBACK": "<domain u provided to google>/auth/google/callback",
        "ADMIN_EMAILS": ["<email1>","<email2>"]
    }
    ```
    
* Download service account key name it `auth.json` and place it in the project root directory.
    
    
## Run

`npm install`

`npm install -g forever`

`forever production.json`
