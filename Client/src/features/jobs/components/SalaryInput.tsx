import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const currencyOptions = ["USD", "INR", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"];

type SalaryInputProps = {
  currency: string;
  salaryMin: number | null;
  salaryMax: number | null;
  onCurrencyChange: (value: string) => void;
  onSalaryMinChange: (value: string) => void;
  onSalaryMaxChange: (value: string) => void;
  disabled?: boolean;
};

export function SalaryInput({
  currency,
  salaryMin,
  salaryMax,
  onCurrencyChange,
  onSalaryMinChange,
  onSalaryMaxChange,
  disabled = false,
}: SalaryInputProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[120px_1fr_1fr]">
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select value={currency} onValueChange={onCurrencyChange} disabled={disabled}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Salary Min</Label>
        <Input
          type="number"
          min={0}
          value={salaryMin ?? ""}
          onChange={(event) => onSalaryMinChange(event.target.value)}
          placeholder="65000"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>Salary Max</Label>
        <Input
          type="number"
          min={0}
          value={salaryMax ?? ""}
          onChange={(event) => onSalaryMaxChange(event.target.value)}
          placeholder="90000"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
