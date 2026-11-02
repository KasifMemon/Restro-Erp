import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Btn, Modal, inputCls } from './components.jsx';
import { downloadCSV, parseCSV } from './utils.js';

/** Generic CSV import: columns = [{key, label, aliases?}], sample = rows for the template. */
export default function CsvImport({ title, columns, sample, validate, onImport, onClose, replaceLabel }) {
  const [text, setText] = useState('');
  const [replace, setReplace] = useState(false);
  const fileRef = useRef();

  const rows = (() => {
    if (!text.trim()) return [];
    const all = parseCSV(text);
    if (!all.length) return [];
    const norm = (x) => x.toLowerCase().replace(/[^a-z]/g, '');
    const head = all[0].map(norm);
    const hasHeader = columns.some((c) => head.includes(norm(c.key)) || (c.aliases || []).some((a) => head.includes(norm(a))));
    const idx = columns.map((c, i) => {
      if (!hasHeader) return i;
      const names = [c.key, ...(c.aliases || [])].map(norm);
      return head.findIndex((h) => names.includes(h));
    });
    return (hasHeader ? all.slice(1) : all).map((r) => {
      const o = {};
      columns.forEach((c, i) => { o[c.key] = idx[i] >= 0 ? (r[idx[i]] || '').trim() : ''; });
      return o;
    });
  })();
  const checked = rows.map((r) => ({ r, err: validate(r) }));
  const good = checked.filter((x) => !x.err);

  const readFile = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => setText(String(rd.result));
    rd.readAsText(f);
  };

  return (
    <Modal title={title} wide onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={!good.length} onClick={() => { onImport(good.map((x) => x.r), replace); onClose(); }}>Import {good.length} row{good.length === 1 ? '' : 's'}</Btn></>}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Btn variant="soft" size="sm" onClick={() => fileRef.current.click()}><Upload size={14} /> Choose CSV file</Btn>
        <Btn variant="ghost" size="sm" onClick={() => downloadCSV(title.toLowerCase().replace(/\W+/g, '-') + '-template.csv', [columns.map((c) => c.key), ...sample])}>Download template</Btn>
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={readFile} />
        <span className="text-xs text-stone-500">Export from Excel/Sheets as CSV, or paste below.</span>
      </div>
      <div className="mb-2 text-xs text-stone-500">Columns: <b>{columns.map((c) => c.key).join(', ')}</b></div>
      <textarea className={inputCls + ' font-mono text-xs'} rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={columns.map((c) => c.key).join(',') + '\n' + sample[0].join(',')} />
      {rows.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-sm"><b className="text-emerald-700">{good.length} ready</b>{checked.length - good.length > 0 && <b className="ml-3 text-red-600">{checked.length - good.length} with problems (skipped)</b>}</div>
          <div className="max-h-52 overflow-auto rounded-xl border border-stone-200">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-stone-100">
                {checked.slice(0, 40).map((x, i) => (
                  <tr key={i} className={x.err ? 'bg-red-50' : ''}>
                    {columns.map((c) => <td key={c.key} className="px-2 py-1">{x.r[c.key]}</td>)}
                    <td className="px-2 py-1 text-red-600">{x.err}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {replaceLabel && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> {replaceLabel}</label>}
    </Modal>
  );
}
