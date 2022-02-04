const express = require('express')
const router = express.Router()

const {
    gitlab_handleWebhook,
    gitlab_getworkflows,
    ping,
} = require('../controllers/gitlab')

router.post("/gl-webhook", gitlab_handleWebhook)
router.get("/gl-getworkflows", gitlab_getworkflows)

router.get("/gl-ping", ping)

module.exports = router