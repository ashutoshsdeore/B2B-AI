"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddPaymentMethodPage() {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: connect with backend API (Prisma + Stripe later)
    console.log({ cardNumber, expiry, cvc, country });
    alert("Payment method added successfully!");
    router.push("/dashboard/payment");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
          T
        </div>
      </div>

      <div className="w-full max-w-md bg-white p-6">
        <h2 className="text-xl font-semibold text-center mb-2">
          Add payment method
        </h2>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Secure, fast checkout with Link
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Number */}
          <div>
            <label className="text-sm text-gray-700">Card number</label>
            <input
              type="text"
              placeholder="1234 1234 1234 1234"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Expiry + CVC */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-700">Expiry date</label>
              <input
                type="text"
                placeholder="MM / YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-700">Security code</label>
              <input
                type="text"
                placeholder="CVC"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="text-sm text-gray-700">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option>United Arab Emirates</option>
              <option>India</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Germany</option>
            </select>
          </div>

          <p className="text-xs text-gray-400">
            By providing your card information, you allow us to charge your card
            for future payments in accordance with our terms.
          </p>

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Add payment method
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/payment")}
            className="w-full text-sm text-gray-500 hover:underline mt-2"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
