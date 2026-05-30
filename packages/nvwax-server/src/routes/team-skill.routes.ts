import { Router } from 'express';
import { teamSkillController } from '../controllers/team-skill.controller.js';

const router = Router();

// Team Skill routes
router.post('/', teamSkillController.createTeamSkill);
router.get('/', teamSkillController.searchTeamSkills);
router.get('/marketplace', teamSkillController.getMarketplaceTeamSkills);
router.get('/user/:userId', teamSkillController.getUserTeamSkills);
router.get('/industry-categories', teamSkillController.getIndustryCategories);
router.get('/category/:category', teamSkillController.getTeamSkillsByCategory);
router.get('/:id/industry-agents', teamSkillController.getIndustryAgents);
router.get('/:id/industry-detail', teamSkillController.getIndustryDetail);
router.get('/:id/package-info', teamSkillController.getPackageInfo);
router.post('/:id/build-package', teamSkillController.buildPackage);
router.get('/:id', teamSkillController.getTeamSkillById);
router.put('/:id', teamSkillController.updateTeamSkill);
router.delete('/:id', teamSkillController.deleteTeamSkill);

export default router;
