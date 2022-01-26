const express = require('express')
const router = express.Router()

const {
    github_handleWebhook,
    github_getworkflows,
    ping,
} = require('../controllers/github')

router.post("/gh-webhook", github_handleWebhook)
router.get("/gh-getworkflows", github_getworkflows)

router.get("/gh-ping", ping)

module.exports = router