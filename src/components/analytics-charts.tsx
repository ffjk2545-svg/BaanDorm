export type MonthlyCashFlow = { key: string; label: string; income: number; expense: number };
export type MonthlyOccupancy = { key: string; label: string; occupied: number; total: number };
export type MonthlyExpense = { key: string; label: string; total: number };
export type ExpenseCategory = { label: string; total: number };

const money = (value: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);

export function AnalyticsCharts({ cashFlow, occupancy, expenses, categories, forecast }: {
  cashFlow: MonthlyCashFlow[];
  occupancy: MonthlyOccupancy[];
  expenses: MonthlyExpense[];
  categories: ExpenseCategory[];
  forecast: { income: number; expenses: number; net: number };
}) {
  const maxCash = Math.max(1, ...cashFlow.flatMap(month => [month.income, month.expense]));
  const maxExpenses = Math.max(1, ...expenses.map(month => month.total));
  const points = occupancy.map((month, index) => {
    const x = occupancy.length === 1 ? 50 : index * 100 / (occupancy.length - 1);
    const percent = month.total ? month.occupied / month.total * 100 : 0;
    return { ...month, x, y: 86 - percent * 0.72, percent };
  });
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");

  return <section className="analytics-section">
    <div className="analytics-heading"><div><span className="dashboard-eyebrow">วิเคราะห์ข้อมูล</span><h2>ภาพรวมการเงินและการเข้าพัก</h2><p className="subtitle">ใช้รายการรับเงินและรายจ่ายที่บันทึกไว้ · เดือนปัจจุบันเป็นยอดสะสมถึงวันนี้</p></div></div>
    <div className="analytics-grid">
      <article className="card analytics-card cashflow-card">
        <div className="analytics-card-heading"><div><h3>กระแสเงินสด</h3><p>รับชำระจริงเทียบกับรายจ่ายจริง</p></div><span className="analytics-period">6 เดือน</span></div>
        <div className="chart-legend"><span><i className="legend-income"/>รับชำระ</span><span><i className="legend-expense"/>รายจ่าย</span></div>
        <div className="cashflow-chart" role="img" aria-label="กราฟรับชำระจริงและรายจ่ายจริงย้อนหลัง 6 เดือน">
          {cashFlow.map(month => <div className="cashflow-month" key={month.key}>
            <div className="cashflow-bars"><i className="cashflow-bar income" style={{ height: `${Math.max(2, month.income / maxCash * 100)}%` }}/><i className="cashflow-bar expense" style={{ height: `${Math.max(2, month.expense / maxCash * 100)}%` }}/></div>
            <span className="chart-month-label">{month.label}</span>
            <span className="sr-only">รับ {money(month.income)} บาท รายจ่าย {money(month.expense)} บาท</span>
          </div>)}
        </div>
        <div className="analytics-forecast"><div><span className="dashboard-eyebrow">ประมาณการเดือนหน้า</span><p>ค่าเช่าตามสัญญาปัจจุบัน − ค่าใช้จ่ายเฉลี่ย 3 เดือนที่ปิดแล้ว</p></div><strong>{money(forecast.net)} บาท</strong></div>
        <div className="analytics-forecast-detail"><span>ค่าเช่าประจำ {money(forecast.income)}</span><span>รายจ่ายเฉลี่ย {money(forecast.expenses)}</span></div>
      </article>

      <article className="card analytics-card occupancy-card">
        <div className="analytics-card-heading"><div><h3>อัตราการเข้าพัก</h3><p>จำนวนสัญญาที่ครอบคลุม ณ สิ้นเดือน</p></div><span className="analytics-period">6 เดือน</span></div>
        <div className="occupancy-chart" role="img" aria-label="กราฟอัตราการเข้าพักย้อนหลัง 6 เดือน">
          <div className="occupancy-y-labels"><span>100%</span><span>50%</span><span>0%</span></div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="occupancy-gridline" d="M0 14H100 M0 50H100 M0 86H100"/>
            {points.length > 1 && <path className="occupancy-line" d={line}/>}
            {points.map(point => <circle key={point.key} cx={point.x} cy={point.y} r="2.2" className="occupancy-point"><title>{point.label}: {Math.round(point.percent)}%</title></circle>)}
          </svg>
        </div>
        <div className="occupancy-labels">{points.map(point => <span key={point.key}>{point.label}</span>)}</div>
        <div className="occupancy-current"><strong>{occupancy.at(-1)?.total ? `${Math.round((occupancy.at(-1)!.occupied / occupancy.at(-1)!.total) * 100)}%` : "—"}</strong><span>อัตราปัจจุบัน · {occupancy.at(-1)?.occupied ?? 0} จาก {occupancy.at(-1)?.total ?? 0} ห้อง</span></div>
      </article>

      <article className="card analytics-card expenses-card">
        <div className="analytics-card-heading"><div><h3>รายจ่ายส่วนกลางรายเดือน</h3><p>รวมค่าใช้จ่ายตามวันที่บันทึก</p></div><span className="analytics-period">6 เดือน</span></div>
        <div className="expense-chart" role="img" aria-label="กราฟเปรียบเทียบรายจ่ายส่วนกลางรายเดือน">
          {expenses.map(month => <div className="expense-month" key={month.key}><div className="expense-bar-track"><i style={{ height: `${Math.max(month.total ? 3 : 0, month.total / maxExpenses * 100)}%` }}/></div><strong>{money(month.total)}</strong><span className="chart-month-label">{month.label}</span></div>)}
        </div>
        <div className="category-breakdown"><h4>หมวดรายจ่ายสูงสุด</h4>{categories.length ? categories.map(category => <div className="category-row" key={category.label}><span>{category.label}</span><strong>{money(category.total)} บาท</strong></div>) : <p className="subtitle">ยังไม่มีรายจ่ายที่บันทึกไว้</p>}</div>
      </article>
    </div>
  </section>;
}

