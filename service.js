const schedule = require('node-schedule');
const init = require('./init');

const eolTesting = require('./modules/eolTesting')

const telegramNotifications = require('./modules/telegramNotifications')
const mailNotifications = require('./modules/mailNotifications')

const process1 = async () => {
	try {
		const configuration = await init.initialize()
		eolTesting.process(configuration)
	} catch (e) {
		console.log(e)
	}
}

const process2 = async () => {
	try {
		telegramNotifications.init()
		mailNotifications.init()
	} catch (e) {
		console.log(e)
	}
}

/**
 * SCHEDULE JOBS
 */
schedule.scheduleJob("*/1 * * * *", function () {
	console.log('PROCESS DATA | ' + new Date())
	process1()
})

schedule.scheduleJob("*/1 * * * *", function () {
	console.log('TELEGRAM NOTIFICATIONS | ' + new Date())
	process2()
})