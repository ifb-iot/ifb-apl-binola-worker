const schedule = require('node-schedule');
const init = require('./init');

const ywd = require('./modules/ywd')

const telegramNotifications = require('./modules/telegramNotifications')

const process1 = async () => {
	try {
		const configuration = await init.initialize()
		ywd.process(configuration)
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