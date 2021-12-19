const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email
{
    constructor(user, url)
    {
        this.to = user.email;
        this.from = `Brandon Mitchell <${process.env.EMAIL_FROM}>`;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
    }

    newTransport() 
    {
        if (process.env.NODE_ENV === 'production')
        {
            // Mailsac Transporter
            return nodemailer.createTransport(
                {
                    service: "Mailgun",
                    auth: {
                        user: process.env.MAILGUN_USERNAME,
                        pass: process.env.MAILGUN_PASSWORD
                    }
                }
            );
        }
        else
        {
            return nodemailer.createTransport(
                {
                    host: process.env.EMAIL_HOST,
                    port: process.env.EMAIL_PORT,
                    auth: {
                        user: process.env.EMAIL_USERNAME,
                        pass: process.env.EMAIL_PASSWORD
                    }
                }
            );
        }
    }

    // Sends the actual email.
    async send(template, subject)
    {
        // 1. Render HTML for the email based off a pug template.
        const html = pug.renderFile(
            `${__dirname}/../Views/Emails/${template}.pug`, 
            {
                firstName: this.firstName,
                url: this.url,
                subject
            }
        );

        // 2. Define email options.
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: htmlToText.convert(html)
        };

        // 3. Create a transport and send the email.
        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome()
    {
        await this.send('welcome', 'Welcome to the Natours Family!');
    }

    async sendPasswordReset()
    {
        await this.send('resetPassword', 'Forgot your password?');
    }
}