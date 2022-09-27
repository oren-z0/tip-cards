import axios from 'axios'
import express from 'express'

import { getCardByHash } from '../services/database'
import { checkIfCardInvoiceIsPaidAndCreateWithdrawId, checkIfCardIsUsed } from '../services/lnbitsHelpers'
import type { Card } from '../../../src/data/Card'
import { ErrorCode, ErrorWithCode } from '../../../src/data/Errors'
import { decodeLnurl } from '../../../src/modules/lnurlHelpers'
import { loadLnurlsFromLnbitsByWithdrawId } from '../../../src/modules/lnbitsHelpers'

const router = express.Router()

router.get('/:cardHash', async (req: express.Request, res: express.Response) => {
  let card: Card | null = null

  // load card from database
  try {
    card = await getCardByHash(req.params.cardHash)
  } catch (error: unknown) {
    console.error(ErrorCode.UnknownDatabaseError, error)
    res.status(500).json({
      status: 'ERROR',
      reason: 'Unknown database error.',
      code: ErrorCode.UnknownDatabaseError,
    })
    return
  }
  if (card == null) {
    res.status(404).json({
      status: 'ERROR',
      reason: 'Card has not been funded yet. Scan the QR code with your QR code scanner and open the URL in your browser to fund it.',
      code: ErrorCode.CardByHashNotFound,
    })
    return
  }

  // check if invoice is already paid and get withdrawId
  if (card.lnbitsWithdrawId == null) {
    try {
      await checkIfCardInvoiceIsPaidAndCreateWithdrawId(card)
    } catch (error: unknown) {
      let code = ErrorCode.UnknownErrorWhileCheckingInvoiceStatus
      let errorToLog = error
      if (error instanceof ErrorWithCode) {
        code = error.code
        errorToLog = error.error
      }
      console.error(code, errorToLog)
      res.status(500).json({
        status: 'ERROR',
        reason: 'Unable to check invoice status at lnbits.',
        code,
      })
      return
    }
  }
  if (card.lnbitsWithdrawId == null) {
    res.status(404).json({
      status: 'ERROR',
      reason: 'Card has not been funded yet. Scan the QR code with your QR code scanner and open the URL in your browser to fund it.',
      code: ErrorCode.CardNotFunded,
    })
    return
  }

  // check if card is already used
  if (card.used == null) {
    try {
      await checkIfCardIsUsed(card)
    } catch (error: unknown) {
      let code = ErrorCode.UnknownErrorWhileCheckingWithdrawStatus
      let errorToLog = error
      if (error instanceof ErrorWithCode) {
        code = error.code
        errorToLog = error.error
      }
      console.error(code, errorToLog)
      res.status(500).json({
        status: 'ERROR',
        reason: 'Unable to check withdraw status at lnbits.',
        code,
      })
      return
    }
  }
  if (card.used != null) {
    res.status(400).json({
      status: 'ERROR',
      reason: 'Card has already been used.',
      code: ErrorCode.WithdrawHasBeenSpent,
    })
    return
  }

  let lnurl = null
  try {
    const lnurls = await loadLnurlsFromLnbitsByWithdrawId(card.lnbitsWithdrawId)
    lnurl = lnurls[0]
  } catch (error) {
    console.error(ErrorCode.UnableToGetLnurl, error)
    res.status(500).json({
      status: 'ERROR',
      reason: 'Unable to get LNURL from lnbits.',
      code: ErrorCode.UnableToGetLnurl,
    })
    return
  }

  if (lnurl == null) {
    res.status(404).json({
      status: 'ERROR',
      reason: 'WithdrawId not found at lnbits.',
      code: ErrorCode.CardByHashNotFound,
    })
    return
  }

  try {
    const response = await axios.get(decodeLnurl(lnurl))
    res.json(response.data)
  } catch (error) {
    console.error(ErrorCode.UnableToResolveLnbitsLnurl, error)
    res.status(500).json({
      status: 'ERROR',
      reason: 'Unable to resolve LNURL at lnbits.',
      code: ErrorCode.UnableToResolveLnbitsLnurl,
    })
  }
})

export default router
