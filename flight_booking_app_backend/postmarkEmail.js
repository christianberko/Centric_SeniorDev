import * as postmark from 'postmark';

const templateHeader = `<!DOCTYPE html>
<html>
    <head>
        <title>Centric Flights</title>
    <style>
        body {
            text-align: center;
            font-family: Arial, Helvetica, sans-serif;
        }
        img {
            width: 150px;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        h1 {
            margin-top: 0;
            color: #408075;
            text-align: center;
        }        
        hr {
            width: 80%;
            border: 1px solid #669991;
        }
        .contents {
            justify-self: center;
            text-align: left;
            width: 80%;
            margin: 30px 0px;
        }
        .main-msg {
            padding: 20px 0;
        }
    </style>
    </head>
    <body>
        <img src="https://u.cubeupload.com/centricflights/logo.png" alt="Centric Flights Logo">
        <h1>Centric Flights</h1>
        <hr>
        <div class="contents">
            <p>`;
const templateFooter = `                Sincerely,
                <br><br>
                Centric Flights
            </p>
        </div>
    </body>
</html>`;

// Send an email:
var client = new postmark.ServerClient("49eaf94c-c321-4584-9b8f-05221cb48801");

// client.sendEmail({
//   "From": "no-reply@centricflights.com",
//   //"From": "npw1107@rit.edu",
//   "To": "npw1107@rit.edu",
//   "Subject": "Postmark Testing",
//   "HtmlBody": "<strong>Hello</strong> dear Postmark user.",
//   "TextBody": "Hello from Postmark!",
//   "MessageStream": "outbound"
// });

const testEmails = ["assassin@thefilter.com", "esme@kanter.com", "rand@zimmermann.com", "astraya@abbott.com", "troy@bates.com"];

export async function sendMFAEmail (to, mfaCode, title, lastName)
{
    try
    {
        if (testEmails.includes(to))
        {
            to = "ndgt18@gmail.com";
        }
      title = (title.substring(0, 1)).toUpperCase() + title.substring(1) + ".";
      const response = await client.sendEmail({
        From: '"Centric Flights" no-reply@centricflights.com',
        To: to,
        Subject: mfaCode + " - Your Centric Flights MFA Code",
        HtmlBody: `${templateHeader}
            <p>
                ${title} ${lastName},
                <p class="main-msg">
                    Your multi-factor authentication code is below. You will have fifteen minutes to enter
                    the code before it expires.
                </p>

                <h1 style="text-align: left;">${mfaCode}</h1>
                ${templateFooter}`,
      });
      console.log("Email Sent: ", response);
    }
    catch (err)
    {
      console.log(err);
    }
}

export async function sendPasswordResetEmail (to, resetString)
{
    try 
    {
        if (testEmails.includes(to))
        {
            to = "centricflights@gmail.com";
        }
        const response = await client.sendEmail({
            From: '"Centric Flights" no-reply@centricflights.com',
            To: to,
            Subject: "Your Centric Flights Password Reset",
            HtmlBody: `${templateHeader}
                <p>
                    Hello,
                    <p class="main-msg">
                        Below is a password reset link for your Centric Flights account, ${to}. You may close out of your current Centric Flights window after
                        clicking the link. The link will expire in fifteen minutes.
                        <br><br>
                        <a href='https://centricflights.com/resetPassword?email=${to}&reset=${resetString}'>Reset Password</a>
                    </p>
                    ${templateFooter}`,
          });
        console.log('Email sent: ', response);
    } 
    catch (err) 
    {
        console.log(err);
    }
}

export async function sendFightConfirmEmail (to, eventName, title, lastName)
{
    try 
    {
        if (testEmails.includes(to))
        {
            to = "centricflights@gmail.com";
        }
        title = (title.substring(0, 1)).toUpperCase() + title.substring(1) + ".";
        const response = await client.sendEmail({
            From: '"Centric Flights" no-reply@centricflights.com',
            To: to,
            Subject: "Booking Confirmation - " + eventName,
            HtmlBody: `${templateHeader}
                <p>
                    ${title} ${lastName},
                    <p class="main-msg">
                        Your booking for ${eventName} has been confirmed. To view more information, please visit
                        your <a href="https://centricflights.com/userProfileHistory">user profile history page</a>.
                    </p>

                    ${templateFooter}`,
        });
        console.log('Email sent: ', response);
    } 
    catch (err) 
    {
        console.log(err);
    }
}

export async function sendPendingEmail (to, eventName, title, lastName)
{
    try 
    {
        if (testEmails.includes(to))
        {
            to = "centricflights@gmail.com";
        }
        title = (title.substring(0, 1)).toUpperCase() + title.substring(1) + ".";
        const response = await client.sendEmail({
            From: '"Centric Flights" no-reply@centricflights.com',
            To: to,
            Subject: "Booking Request - " + eventName,
            HtmlBody: `${templateHeader}
                <p>
                    ${title} ${lastName},
                    <p class="main-msg">
                        Your booking for ${eventName} has been submitted for approval. To view more information and updates, please visit
                        your <a href="https://centricflights.com/userProfileHistory">user profile history page</a>.
                    </p>

                    ${templateFooter}`,
        });
        console.log('Email sent: ', response);
    } 
    catch (err) 
    {
        console.log(err);
    }
}

export async function sendOrganizationInvite (to, organizationName)
{
    try
    {
        if (testEmails.includes(to))
        {
            to = "centricflights@gmail.com";
        }
      const response = await client.sendEmail({
        From: '"Centric Flights" no-reply@centricflights.com',
        To: to,
        Subject: `Invite to ${organizationName}`,
        HtmlBody: `${templateHeader}
            <p>
                Hello!
                <p class="main-msg">
                    You have been invited to ${organizationName} to be a part of their events, supported by Centric
                    Flights! Go to <a href="https://centricflights.com">your event dashboard</a> to view any new events.
                </p>

                ${templateFooter}`,
      });
      console.log("Email Sent: ", response);
    }
    catch (err)
    {
      console.log(err);
    }
}

export async function sendNewUserOrganizationInvite (to, organizationName, randomPass)
{
    try
    {
        if (testEmails.includes(to))
        {
            to = "centricflights@gmail.com";
        }
      const response = await client.sendEmail({
        From: '"Centric Flights" no-reply@centricflights.com',
        To: to,
        Subject: `Invite to ${organizationName}`,
        HtmlBody: `${templateHeader}
            <p>
                Hello!
                <p class="main-msg">
                    You have been invited to ${organizationName} to be a part of their events, supported by Centric
                    Flights! Go to <a href="https://centricflights.com/signIn">the sign in page</a> and sign in using the password
                    below to get started!.
                </p>

                <h1 style="text-align: left;">${randomPass}</h1>

                ${templateFooter}`,
      });
      console.log("Email Sent: ", response);
    }
    catch (err)
    {
      console.log(err);
    }
}