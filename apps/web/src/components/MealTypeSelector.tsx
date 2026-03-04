"use client";

interface MealTypeSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "🌅 Breakfast" },
  { value: "lunch", label: "🍽️ Lunch" },
  { value: "dinner", label: "🌙 Dinner" },
];

function MealTypeSelector({ selected, onChange }: MealTypeSelectorProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">Meal types</p>
      <div className="flex flex-wrap gap-3">
        {MEAL_TYPES.map(({ value, label }) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => toggle(value)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export { MealTypeSelector };
export type { MealTypeSelectorProps };
