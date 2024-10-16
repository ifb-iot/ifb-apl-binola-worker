const schedule = require('node-schedule');
const init = require('./init');

const eolTesting = require('./modules/eolTesting')

const telegramNotifications = require('./modules/telegramNotifications')
const mailNotifications = require('./modules/mailNotifications')

const process1 = async () => {
	try {
		for (let x = 0; x < 30; x++) {
			const configuration = await init.initialize(x)
			eolTesting.process(configuration)
		}
	} catch (e) {
		console.log(e)
	}
}

const process2 = async () => {
	try {
		telegramNotifications.init()
	} catch (e) {
		console.log(e)
	}
}

const process3 = async () => {
	try {
		mailNotifications.init()
	} catch (e) {
		console.log(e)
	}
}

/**
 * SCHEDULE JOBS
 */
schedule.scheduleJob("*/5 * * * *", function () {
	console.log('PROCESS DATA | ' + new Date())
	process1()
})

schedule.scheduleJob("*/3 * * * *", function () {
	console.log('TELEGRAM NOTIFICATIONS | ' + new Date())
	process2()
})

schedule.scheduleJob("*/59 * * * *", function () {
	console.log('MAIL NOTIFICATIONS | ' + new Date());
	process3()
});