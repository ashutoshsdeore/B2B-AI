export default function PlanPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plan</h1>

      {/* Subscription Section */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Subscription</h2>
          <button className="text-blue-600 text-sm font-medium hover:underline">
            Change plan
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between">
          <div>
            <p className="text-sm text-green-600 font-semibold">Plan</p>
            <p className="font-medium text-gray-900">Pro</p>
            <p className="text-xs text-gray-500">Since 11 Oct 2025 (monthly)</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">$99 USD</p>
            <p className="text-xs text-gray-500">
              Billing period 11 Oct 2025 → 11 Nov 2025
            </p>
          </div>
        </div>
      </section>

      {/* Fixed Charges */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-medium mb-3">Fixed charges</h2>
        <div className="border border-gray-200 rounded-lg p-4 flex justify-between">
          <span>Base Price</span>
          <span>$99 USD</span>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-medium mb-3">Features and pricing</h2>
        <div className="space-y-2">
          <div className="flex justify-between border border-gray-200 rounded-lg p-3">
            <span>Advanced Analytics / Insights</span>
            <span>0</span>
          </div>
          <div className="flex justify-between border border-gray-200 rounded-lg p-3">
            <span>AI Message Generation</span>
            <span>0 / 100</span>
          </div>
        </div>
      </section>
    </div>
  );
}
