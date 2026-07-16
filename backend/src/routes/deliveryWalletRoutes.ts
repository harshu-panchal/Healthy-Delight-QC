import { Router } from 'express';
import * as walletController from '../modules/delivery/controllers/deliveryWalletController';
import { authenticate, requireUserType } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireUserType('Delivery'));

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/withdraw', walletController.requestWithdrawal);
router.get('/withdrawals', walletController.getWithdrawals);
router.get('/commissions', walletController.getCommissions);
router.post('/payout/create', walletController.createAdminPayoutOrder);
router.post('/payout/verify', walletController.verifyAdminPayout);
router.post('/cod-deposit/create', walletController.createCODDepositOrder);
router.post('/cod-deposit/verify', walletController.verifyCODDeposit);


export default router;
