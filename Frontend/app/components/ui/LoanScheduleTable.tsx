'use client';

import { useState } from "react";

export default function LoanScheduleTable() {
  const [loans, setLoans] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [installments, setInstallments] = useState(1);

  const addLoan = () => {
    const perMonth = amount / installments;
    setLoans([...loans, { name, amount, installments, perMonth, remaining: amount }]);
    setName("");
    setAmount(0);
    setInstallments(1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 max-w-3xl">
        <input
          className="input input-bordered"
          placeholder="Employee Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input input-bordered"
          type="number"
          placeholder="Loan Amount"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <input
          className="input input-bordered"
          type="number"
          placeholder="Installments"
          value={installments}
          onChange={(e) => setInstallments(Number(e.target.value))}
        />
        <button onClick={addLoan} className="btn btn-primary col-span-3">
          Add Loan
        </button>
      </div>

      <table className="w-full text-sm border mt-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Employee</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Installments</th>
            <th className="p-2">Monthly</th>
            <th className="p-2">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{loan.name}</td>
              <td className="p-2">AED {loan.amount}</td>
              <td className="p-2">{loan.installments}</td>
              <td className="p-2">AED {loan.perMonth.toFixed(2)}</td>
              <td className="p-2">AED {loan.remaining.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
