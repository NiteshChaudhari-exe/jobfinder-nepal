# JobFinder Nepal user guide

This guide explains the current working flows. JobFinder is an MVP; see [known limitations](#current-limitations) before relying on placeholder controls.

## Candidates

1. Open `/login`, choose **Create account**, and create a user account.
2. Browse `/jobs`. Search by text and filter by location or job type.
3. Open a published listing to read its details.
4. Sign in and use **Apply now**.
5. Open `/dashboard` to see your applications and their status.

Public job browsing does not require an account. Applying does.

## Employers

1. Open `/login`, choose **Create account**, and select **I am hiring** as the account type.
2. Sign in with the employer account and open `/employer-dashboard`.
3. Create a company profile if you do not already own one.
4. Fill out the job-post form and choose **Post job**.
5. Use the job card controls to edit a posting, save it as a draft, publish it, or delete it.

Draft, rejected, and hidden listings do not appear in public job browsing or public job-detail responses. Employers can manage only their own postings. Admin accounts are not available through public registration.

## Administrators

An admin can review all jobs at `/admin-dashboard`, publish/approve them, or reject them. This project does not yet provide an admin account provisioning screen or seed script. Do not attempt to create an admin account through public signup.

## Current limitations

- If the jobs API is unavailable or returns no records, the browse page may show demo cards. Those are not real listings and cannot be applied to.
- Applications collect a resume URL and cover letter. Uploading an actual resume file is not implemented.
- Google sign-in is a placeholder button and is not connected to OAuth.
- Candidate dashboard saved-job and resume counts are placeholders.
- Notifications are not currently connected to the running API.

For connection and setup help, see the [repository README](../README.md). For API details, see the [architecture guide](architecture.md).
