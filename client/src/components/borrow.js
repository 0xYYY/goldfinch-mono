import React, { useState, useContext, useEffect } from 'react';
import CreditActionsContainer from './creditActionsContainer.js';
import CreditBarViz from './creditBarViz.js';
import CreditTerms from './creditTerms.js';
import PaymentStatus from './paymentStatus.js';
import web3 from '../web3.js';
import { buildCreditLine, fetchCreditLineData } from '../ethereum/creditLine.js';
import { AppContext } from '../App.js';

function Borrow(props) {
  const { creditDesk } = useContext(AppContext);
  const [borrower, setBorrower] = useState('');
  const [creditLine, setCreditLine] = useState({});
  const [creditLineFadtory, setCreditLineFactory] = useState({});

  useEffect(() => {
    if (!creditDesk) {
      return;
    }
    async function updateBorrowerAndCreditLine() {
      let creditLine = {};
      const [borrower] = await web3.eth.getAccounts();
      if (borrower) {
        const borrowerCreditLines = await creditDesk.methods.getBorrowerCreditLines(borrower).call();
        if (borrowerCreditLines.length) {
          const factory = buildCreditLine(borrowerCreditLines[0]);
          setCreditLineFactory(factory);
          creditLine = await fetchCreditLineData(factory);
        }
      }
      setBorrower(borrower);
      setCreditLine(creditLine);
    }
    updateBorrowerAndCreditLine();
  }, [creditDesk]);

  async function actionComplete() {
    const newCreditLine = await fetchCreditLineData(creditLineFadtory);
    setBorrower(borrower);
    setCreditLine(newCreditLine);
  }

  return (
    <div className="content-section">
      <div className="page-header">Credit Line / {creditLine.address}</div>
      <CreditBarViz creditLine={creditLine} />
      <CreditActionsContainer borrower={borrower} creditLine={creditLine} actionComplete={actionComplete} />
      <PaymentStatus creditLine={creditLine} />
      <CreditTerms creditLine={creditLine} />
    </div>
  );
}

export default Borrow;