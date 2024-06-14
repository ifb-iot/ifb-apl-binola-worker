require("dotenv").config();

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	host: process.env.MAIL_HOST,
	secure: false,
	port: process.env.MAIL_PORT,
	auth: {
		user: process.env.MAIL_USERNAME,
		pass: process.env.MAIL_PASSWORD
	},
	tls: {
		rejectUnauthorized: false
	}
});

const getMailBody = async (to, cc, subject, body) => {
	let mailbody = {
		from: process.env.MAIL_USERNAME,
		to: to,
		cc: cc,
		subject: subject,
		html: body
	};
	return mailbody
}

const getMailResponse = (mailBody) => {
	return new Promise((resolve, reject) => {
		transporter.sendMail(mailBody, function (error, info) {
			if (error) {
				reject(error);
			} else {
				resolve(info);
			}
		});
	});
}

const autoMailer = async (to, cc, subject, body) => {
	try {
		const postedMailBody = await getMailBody(to, cc, subject, body)
		const postedMailResponse = await getMailResponse(postedMailBody)
		if (postedMailResponse != undefined) {
			if (postedMailResponse.accepted.length > 0) {
				await new Promise(resolve => setTimeout(resolve, 10000));
				console.log("EMAIL NOTIFICATIONS | SENT | " + new Date())
			}
		}
	} catch (err) {
		console.log(err)
		return "error"
	}

}

exports.autoMailer = autoMailer;