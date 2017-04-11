const INTENT_MOOD = "mood";
const INTENT_JOBS_IN_PROGRESS = "jobs_in_progress";
const INTENT_JOBS_QUEUED = "jobs_queued";
const INTENT_LAUNCH_JOB = "launch_job";
const INTENT_DEPLOY_APP = "deploy_app";
const INTENT_NOTIFY_DEPLOYMENT = "notify_deployment";
const JOB_ARGUMENT = "job";

var jenkins = require('jenkins')({
	baseUrl: 'http://<user>:<password>@<jenkins_url>'
});

const moment = require('moment');
moment.locale('fr');

function mood(callback) {
	jobsQueued(function(reply) {
			if (reply == "Il n'y a pas de job en attente.") {
				jobsInProgress(function(reply) {
					if (reply == "Il n'y a pas de job en cours.") {
						callback("Je m'ennuie, je n'ai rien à faire...")
					} else {
						callback("Je bosse !");
					}
				});
			}	else {
				callback("Je suis débordé !");
			}
	});
}

function jobsInProgress(callback) {
	jenkins.job.list(function(err, data) {
		if (err) {
			console.log('error', "Impossible d'obtenir les informations de Jenkins");
			callback("Impossible d'obtenir les informations de Jenkins");
			return;
		}
		var runningJobs = data
			.filter(function(job) {
				return job.color.indexOf('_anime') != -1;
			})
			.map(function(job) {
				console.log("debug", job);
				return job.name;
			})
			.join('\n');
		if (runningJobs == "")
			runningJobs = "Il n'y a pas de job en cours.";
		console.log('debug', `Jobs en cours ${runningJobs}`);
		callback(runningJobs);
	});
}

function jobsQueued(callback) {
	jenkins.queue.list(function(err, data) {
		if (err) {
			console.log('error', "Impossible d'obtenir les informations de Jenkins");
			return "Impossible d'obtenir les informations de Jenkins";
		}
		if (data.length == 0) {
			callback("Il n'y a pas de job en attente.");
			return;
		}
		console.log('debug', data);
		var queuedJobs = data
			.map(function(job) {
				var since = moment(job.inQueueSince, "x");
				return `${job.task.name}, en attente depuis ${since.fromNow(true)}`;
			})
			.join('\n');
			console.log('debug', `Jobs en attente ${queuedJobs}`);
			callback(queuedJobs);
	});
}

function launchJob(job, callback) {
	jenkins.job.build(job, function(err, data) {
		if (err) {
			console.log('error', `Erreur au lancement du job ${job} !`);
			callback(`Le job ${job} n'a pas pu être lancé !`);
			return;
		}
		console.log('info', `Le job ${job} vient d'être lancé.`);
		callback(`Le job ${job} vient d'être lancé.`);
	});
}

function deployApp(environment, callback) {
	jenkins.job.build('<your_jenkins_job>', function(err, data) {
		if (err) {
			console.log('error', `La livraison en ${environment} n'a pas pu être faite !`);
			callback(`La livraison en ${environment} n'a pas pu être faite !`);
			return;
		}
		console.log('info', `La livraison en ${environment} vient d'être lancée.`);
		callback(`La livraison en ${environment} vient d'être lancée.`);
	});
}

function notifyDeployment(callback) {
	jenkins.job.build('<your_jenkins_job>', function(err, data) {
		if (err) {
			console.log('error', "Impossible de notifier les utilisateurs :-(");
			callback("Impossible de notifier les utilisateurs :-(");
			return;
		}
		console.log('info', "Je viens de prévenir les utilisateurs de la livraison faite.");
		callback("Je viens de prévenir les utilisateurs de la livraison faite.");
	});
}

exports.slackBot = (req, res) => {
	console.log('debug', req.body);

	// filter to only serve mentions
	var botID = req.body.originalRequest.data.authed_users[0];
	if (req.body.originalRequest.data.event.text.indexOf(botID) == -1) {
		console.log("info", "Message is not sent for the bot");
		res.send();
		return;
	}

	var action = req.body.result.action;
	console.log('debug', `Action is ${action}`);
	switch (action) {
		case INTENT_MOOD:
			var reply = mood(function(reply) {
				var result = `{ "messages": [ { "type": 0, "speech": "${reply}" }]}`;
				res.send(result);
			});
			break;
		case INTENT_JOBS_IN_PROGRESS:
			var reply = jobsInProgress(function(reply) {
				var result = `{ "messages": [ { "type": 0, "speech": "${reply}" }]}`;
				res.send(result);
			});
			break;
		case INTENT_JOBS_QUEUED:
			var reply = jobsQueued(function(reply) {
				var result = `{ "messages": [ { "type": 0, "speech": "${reply}" }]}`;
				res.send(result);
			});
			break;
		case INTENT_LAUNCH_JOB:
			var job = req.body.result.parameters.job;
			var reply = launchJob(job, function(reply) {
				var result = `{ "messages": [ { "type": 0, "speech": "${reply}" }]}`;
				res.send(result);
			});
			break;
		case INTENT_DEPLOY_APP:
			var environment = req.body.result.parameters.environment;
			var reply = deployApp(environment, function(reply) {
				var result = `{ "messages": [ { "type": 0, "speech": "${reply}" }]}`;
				res.send(result);
			});
			break;
		case INTENT_NOTIFY_DEPLOYMENT:
			var environment = req.body.result.parameters.environment;
			var reply = notifyDeployment(function(reply) {
				var result = `{ "messages": [ { "type": 0, "speech": "${reply}" }]}`;
				res.send(result);
			});
			break;
	}
}
