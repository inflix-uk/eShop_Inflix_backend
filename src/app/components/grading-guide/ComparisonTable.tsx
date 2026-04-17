import React from "react";

interface ComparisonRow {
  grade: string;
  cosmeticCondition: string;
  functionality: string;
  whoItsFor: string;
  priceVsNew: string;
}

interface ComparisonTableProps {
  comparisonTable: ComparisonRow[];
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  comparisonTable,
}) => {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
        Quick Comparison
      </h2>
      <div className="overflow-x-auto bg-white/90 rounded-xl border border-gray-300/[0.3] shadow-sm">
        <table className="w-full text-gray-900/90 table-auto bg-white/90">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cosmetic Condition
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Functionality
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Who it&apos;s for
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price vs New
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {comparisonTable.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.grade}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {row.cosmeticCondition}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {row.functionality}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {row.whoItsFor}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {row.priceVsNew}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ComparisonTable;
