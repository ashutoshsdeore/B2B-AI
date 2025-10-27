"use client";
import Link from "next/link";
import Image from "next/image";

export default function PaymentDetailsPage() {
  return (
    <div className="max-w-3xl mx-auto bg-white p-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Payment details</h1>
        <Link
          href="/dashboard/payment/add"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Add card
        </Link>
      </div>

      <div className="border border-gray-200 rounded-xl p-5 flex items-center gap-4 bg-white shadow-sm">
        <div className="w-10 h-7 relative">
          <Image src="/visa-logo.png" alt="Visa" fill className="object-contain" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-800">•••• 4242</p>
          <p className="text-sm text-gray-500">Expires: 4/2042</p>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-md">
          Default
        </span>
      </div>
    </div>
  );
}
