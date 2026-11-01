const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.route('/')
  .get(teamController.getTeamMembers);

router.route('/invite')
  .post(teamController.inviteMember);

router.route('/:id')
  .delete(teamController.removeMember);

module.exports = router;
