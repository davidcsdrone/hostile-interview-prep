"use client";

export function AboutSettings() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
      <h2 className="text-sm font-medium text-gray-900">About</h2>
      <p className="text-base font-semibold text-gray-900">Hostile Logic Trainer</p>
      <p className="text-sm text-gray-600 leading-relaxed">
        A practice tool for tough company interviews. You pick a company and role, answer a
        question on camera, then get AI-written feedback on how clear and complete your
        reasoning was.
      </p>
      <p className="text-sm text-gray-500 leading-relaxed">
        Feedback is AI-generated for practice only. It is not a real hiring decision, and it
        does not come from Amazon, Google, Meta, or any employer.
      </p>
    </div>
  );
}
