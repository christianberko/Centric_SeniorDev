import nodemailer from 'nodemailer';

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
            width: 8em;
        }
        h1 {
            margin-top: 0;
            color: #408075;
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
        <img src="https://i.postimg.cc/RhvHLZPH/logo.png" alt="Centric Flights Logo">
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

// Create a transporter object using SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'hotmail', 'yahoo', etc. if needed
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: 'centricflights@gmail.com',
        pass: 'ymvw ezrq nzzq vmah'
    }
});

// Function to send an email
export async function sendEmail(to, subject, text) {
    const mailOptions = {
        //from: '"Centric Flights" <centricflights@gmail.com>',
        from: '"Centric Flights" <no-reply@centricflights.com>',
        to: to,
        subject: subject,
        text: text,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export async function sendMFAEmail (to, mfaCode, title, lastName)
{
    console.log("Real Email", to);
    title = (title.substring(0, 1)).toUpperCase() + title.substring(1) + ".";
    const mailOptions = {
        from: '"Centric Flights" <no-reply@centricflights.com>',
        to: "ndgt18@gmail.com",
        subject: mfaCode + " - Your Centric Flights MFA Code",
        html: `${templateHeader}
            <p>
                ${title} ${lastName},
                <p class="main-msg">
                    Your multi-factor authentication code is below. You will have fifteen minutes to enter
                    the code before it expires.
                </p>

                <h1>${mfaCode}</h1>
                ${templateFooter}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export async function sendPasswordResetEmail (to, resetString)
{
    console.log("Real Email", to);
    const mailOptions = {
        from: '"Centric Flights" <no-reply@centricflights.com>',
        to: "ndgt18@gmail.com",
        subject: "Your Centric Flights Password Reset",
        html: `${templateHeader}
            <p>
                Hello,
                <p class="main-msg">
                    Below is a password reset link for your Centric Flights account, ${to}. You may close out of your current Centric Flights window after
                    clicking the link. The link will expire in fifteen minutes.
                    <br><br>
                    <a href='https://centricflights.com/resetPassword?email=${to}&reset=${resetString}'>Reset Password</a>
                </p>
                ${templateFooter}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export async function sendFightConfirmEmail (to, eventName, title, lastName)
{
    console.log("Real Email", to);
    title = (title.substring(0, 1)).toUpperCase() + title.substring(1) + ".";
    const mailOptions = {
        from: '"Centric Flights" <no-reply@centricflights.com>',
        to: "ndgt18@gmail.com",
        subject: "Booking Confirmation - " + eventName,
        html: `${templateHeader}
            <p>
                ${title} ${lastName},
                <p class="main-msg">
                    Your booking for ${eventName} has been confirmed. To view more information, please visit
                    your <a href="https://centricflights.com/userProfileHistory">user profile history page</a>.
                </p>

                ${templateFooter}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export async function sendPendingEmail (to, eventName, title, lastName)
{
    console.log("Real Email", to);
    title = (title.substring(0, 1)).toUpperCase() + title.substring(1) + ".";
    const mailOptions = {
        from: '"Centric Flights" <no-reply@centricflights.com>',
        to: "ndgt18@gmail.com",
        subject: "Booking Confirmation - " + eventName,
        html: `${templateHeader}
            <p>
                ${title} ${lastName},
                <p class="main-msg">
                    Your booking for ${eventName} has been submitted for approval. To view more information and updates, please visit
                    your <a href="https://centricflights.com/userProfileHistory">user profile history page</a>.
                </p>

                ${templateFooter}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export async function sendOrganizationInvite (to, organizationName)
{
    console.log("Real Email", to);
    const mailOptions = {
        from: '"Centric Flights" <no-reply@centricflights.com>',
        to: "ndgt18@gmail.com",
        subject: `Invite to ${organizationName}`,
        html: `${templateHeader}
            <p>
                Hello!
                <p class="main-msg">
                    You have been invited to ${organizationName} to be a part of their events, supported by Centric
                    Flights! Go to <a href="https://centricflights.com">your event dashboard</a> to view any new events.
                </p>

                ${templateFooter}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export async function sendNewUserOrganizationInvite (to, organizationName, randomPass)
{
    console.log("Real Email", to);
    const mailOptions = {
        from: '"Centric Flights" <no-reply@centricflights.com>',
        to: "ndgt18@gmail.com",
        subject: `Invite to ${organizationName}`,
        html: `${templateHeader}
            <p>
                Hello!
                <p class="main-msg">
                    You have been invited to ${organizationName} to be a part of their events, supported by Centric
                    Flights! Go to <a href="https://centricflights.com/signIn">the sign in page</a> and sign in using the password
                    below to get started!.
                </p>

                <h1>${randomPass}</h1>

                ${templateFooter}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

//sendMFAEmail("assassin@thefilter.com", 292992, "Mr.", "Zimmermann");