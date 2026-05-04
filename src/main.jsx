import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import './styles.css';

const STORAGE_KEY = 'actes-penya-v1';
const MEMBERS_STORAGE_KEY = 'actes-penya-members-v1';
const PENYA_NAME = 'Enflamats';
const DEFAULT_MEMBERS = [
  'Biel Calvo Payes',
  'Vinyet Maduell Carbonell',
  'Gerard Calvo Payes',
  'Julia Bachs Balada',
  'Nagore Leon Boque',
  'Claudia Serigo Soriano',
  'Noa Diez Navarro',
  'Abril Massabe Montoli',
  'Biel Ibanez Ferre',
  'Andreu Pujol Baulenes',
  'Jesus Lopez Martinez',
  'Joan Bachs Balada',
  'Marti Serra Garcia',
  'Joan Serigo Soriano',
  'Txell Ibanez Ferre',
  'Joan Ripolles',
  'Blai Ortiz Pan',
  'Max Pons Pique',
  'Gerard Mayo Obando',
];

const emptyVoteOption = () => ({
  id: crypto.randomUUID(),
  label: '',
  votes: '',
});

const emptyAgendaItem = () => ({
  id: crypto.randomUUID(),
  title: '',
  discussion: '',
  hasVote: false,
  voteOptions: [emptyVoteOption(), emptyVoteOption()],
});

const emptyMinutes = () => ({
  id: crypto.randomUUID(),
  penyaName: PENYA_NAME,
  meetingNumber: '',
  meetingTitle: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '',
  endTime: '',
  location: '',
  president: '',
  secretary: '',
  attendees: '',
  absentees: '',
  presentMembers: {},
  agenda: [emptyAgendaItem()],
  updatedAt: new Date().toISOString(),
});

function loadMinutes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMinutes(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadMembers() {
  try {
    const savedMembers = JSON.parse(localStorage.getItem(MEMBERS_STORAGE_KEY)) || [];
    return [...new Set([...DEFAULT_MEMBERS, ...savedMembers])];
  } catch {
    return DEFAULT_MEMBERS;
  }
}

function saveMembers(members) {
  const customMembers = members.filter((member) => !DEFAULT_MEMBERS.includes(member));
  localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(customMembers));
}

function splitPeople(value) {
  return value
    .split(/\n|,/)
    .map((person) => person.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return 'Sense data';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function attendeesCount(value) {
  return splitPeople(value).length;
}

function titleForMinutes(minutes) {
  return `Acta ${formatDate(minutes.date)}`;
}

function membersForMinutes(minutes, members = DEFAULT_MEMBERS) {
  return [...new Set([...members, ...Object.keys(minutes.presentMembers || {})])];
}

function presentMembersFor(minutes, members = DEFAULT_MEMBERS) {
  if (minutes.presentMembers && Object.keys(minutes.presentMembers).length) {
    return minutes.presentMembers;
  }
  const legacyAttendees = new Set(splitPeople(minutes.attendees));
  return Object.fromEntries(membersForMinutes(minutes, members).map((member) => [member, legacyAttendees.has(member)]));
}

function attendeesFor(minutes, members = DEFAULT_MEMBERS) {
  const presentMembers = presentMembersFor(minutes, members);
  return membersForMinutes(minutes, members).filter((member) => presentMembers[member]);
}

function absenteesFor(minutes, members = DEFAULT_MEMBERS) {
  const presentMembers = presentMembersFor(minutes, members);
  return membersForMinutes(minutes, members).filter((member) => !presentMembers[member]);
}

function countAttendees(minutes, members = DEFAULT_MEMBERS) {
  return attendeesFor(minutes, members).length || attendeesCount(minutes.attendees || '');
}

function safeFileDate(value) {
  return value || new Date().toISOString().slice(0, 10);
}

async function downloadPdf(minutes, members = DEFAULT_MEMBERS) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const topY = 14;
  const contentTop = 28;
  const bottomY = 276;
  const line = 6.4;
  let y = contentTop;

  const headerText = `Penya ${PENYA_NAME} UESA`;
  const actaText = `Acta de reunió nº ${minutes.meetingNumber || '-'}`;

  const drawHeader = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.2);
    doc.text(headerText, marginX, topY);
    doc.text(actaText, pageWidth - marginX, topY, { align: 'right' });
  };

  const addPageIfNeeded = (height = line) => {
    if (y + height > bottomY) {
      doc.addPage();
      drawHeader();
      y = contentTop;
    }
  };

  const text = (content, x = marginX, options = {}) => {
    const { size = 10.5, bold = false, width = pageWidth - marginX * 2, gap = line, align = 'left' } = options;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(content || '-', width);
    addPageIfNeeded(lines.length * gap);
    doc.text(lines, x, y, { align });
    y += lines.length * gap;
  };

  const inlineLabel = (label, value, x) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '-', x + doc.getTextWidth(label) + 4, y);
  };

  const peopleColumns = (people) => {
    const items = Array.isArray(people) ? people : splitPeople(people);
    if (!items.length) {
      text('-', marginX, { size: 11.2 });
      return;
    }
    const leftX = marginX;
    const rightX = 108;
    const lineHeight = 6.4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.2);
    for (let index = 0; index < items.length; index += 2) {
      addPageIfNeeded(lineHeight);
      doc.text(`- ${items[index]}`, leftX, y);
      if (items[index + 1]) doc.text(`- ${items[index + 1]}`, rightX, y);
      y += lineHeight;
    }
  };

  const sectionTitle = (label) => {
    y += 5;
    text(label, marginX, { size: 12, bold: true, gap: line + 0.8 });
  };

  drawHeader();

  inlineLabel('Data:', formatDate(minutes.date), marginX);
  inlineLabel("Hora d'inici:", minutes.startTime, 82);
  y += line;
  inlineLabel('Lloc / Plataforma:', minutes.location, marginX);
  y += line + 1.5;

  sectionTitle('Assistents:');
  peopleColumns(attendeesFor(minutes, members));
  sectionTitle('Absents amb justificació:');
  peopleColumns(absenteesFor(minutes, members));

  sectionTitle('Ordre del dia:');
  minutes.agenda.forEach((item, index) => {
    text(`${index + 1}. ${item.title || 'Punt sense titol'}`, marginX, { size: 11.2, width: pageWidth - marginX * 2, gap: line + 0.6 });
  });

  doc.addPage();
  drawHeader();
  y = contentTop;
  sectionTitle('Desenvolupament:');
  minutes.agenda.forEach((item, index) => {
    y += 8;
    text(`Punt ${index + 1}:   ${item.title || 'Punt sense titol'}`, marginX, {
      size: 12.3,
      bold: true,
      gap: line + 0.8,
      width: pageWidth - marginX * 2,
    });
    if (item.discussion) text(item.discussion, marginX, { size: 11.2, gap: line + 0.8, width: pageWidth - marginX * 2 });
    if (item.hasVote && item.voteOptions?.length) {
      y += 2;
      text('Votació:', marginX, { size: 11.2, bold: true, gap: line + 0.4 });
      item.voteOptions
        .filter((option) => option.label || option.votes)
        .forEach((option) => {
          text(`- ${option.label || 'Opcio'}:   ${option.votes || 0} vots`, marginX + 6, { size: 11.2, gap: line + 0.3 });
        });
    }
  });

  y += 10;
  inlineLabel('Hora de finalització:', minutes.endTime, marginX);
  y += line + 1;

  const signatureY = pageHeight - 28;
  if (y > signatureY - 16) {
    doc.addPage();
    drawHeader();
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.2);
  doc.text(`Signatura del/la president/a: ${minutes.president || '-'}`, marginX, signatureY);
  doc.line(marginX, signatureY + 8, marginX + 72, signatureY + 8);
  doc.text(`Signatura del/la secretari/a: ${minutes.secretary || '-'}`, 118, signatureY);
  doc.line(118, signatureY + 8, pageWidth - marginX, signatureY + 8);

  doc.save(`acta-penya-${safeFileDate(minutes.date)}.pdf`);
}

function App() {
  const [minutesList, setMinutesList] = useState(loadMinutes);
  const [members, setMembers] = useState(loadMembers);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    saveMinutes(minutesList);
  }, [minutesList]);

  useEffect(() => {
    saveMembers(members);
  }, [members]);

  const sortedMinutes = useMemo(
    () => [...minutesList].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [minutesList]
  );

  const startNew = () => setEditing(emptyMinutes());
  const openMinutes = (id) => setEditing(minutesList.find((item) => item.id === id));

  const removeMinutes = (id) => {
    if (confirm('Vols eliminar aquesta acta?')) {
      setMinutesList((items) => items.filter((item) => item.id !== id));
      if (editing?.id === id) setEditing(null);
    }
  };

  const persistMinutes = (minutes) => {
    const presentMembers = presentMembersFor(minutes, members);
    const saved = {
      ...minutes,
      penyaName: PENYA_NAME,
      meetingTitle: titleForMinutes(minutes),
      attendees: attendeesFor({ ...minutes, presentMembers }, members).join('\n'),
      absentees: absenteesFor({ ...minutes, presentMembers }, members).join('\n'),
      presentMembers,
      updatedAt: new Date().toISOString(),
    };
    setMinutesList((items) => {
      const exists = items.some((item) => item.id === saved.id);
      return exists ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items];
    });
    setEditing(null);
  };

  return (
    <main className="app-shell">
      {!editing ? (
        <Home
          minutesList={sortedMinutes}
          onCreate={startNew}
          onOpen={openMinutes}
          onDelete={removeMinutes}
          onDownload={(minutes) => downloadPdf(minutes, members)}
          members={members}
        />
      ) : (
        <MinutesForm
          minutes={editing}
          members={members}
          onAddMember={(member) => setMembers((current) => [...new Set([...current, member])])}
          onCancel={() => setEditing(null)}
          onSave={persistMinutes}
        />
      )}
    </main>
  );
}

function Home({ minutesList, onCreate, onOpen, onDelete, onDownload, members }) {
  return (
    <>
      <section className="hero">
        <img className="penya-logo" src="/logo-penya.png" alt="Logo de la penya" onError={(event) => { event.currentTarget.src = '/icon-512.png'; }} />
        <p className="eyebrow">Gestio privada de reunions</p>
        <h1>Actes de la Penya</h1>
        <button className="primary-button" onClick={onCreate}>Crear nova acta</button>
      </section>

      <section className="list-section">
        <h2>Actes guardades</h2>
        {minutesList.length === 0 ? (
          <div className="empty-state">
            <strong>Encara no hi ha cap acta.</strong>
            <span>Crea la primera i quedara guardada nomes en aquest dispositiu.</span>
          </div>
        ) : (
          <div className="minutes-list">
            {minutesList.map((minutes) => (
              <article className="minutes-card" key={minutes.id}>
                <button className="download-icon-button" onClick={() => onDownload(minutes)} aria-label="Descarregar PDF">
                  <DownloadIcon />
                </button>
                <div>
                  <time>{formatDate(minutes.date)}</time>
                  <h3>{titleForMinutes(minutes)}</h3>
                  <p>{countAttendees(minutes, members)} assistents</p>
                </div>
                <div className="card-actions">
                  <button onClick={() => onOpen(minutes.id)}>Editar</button>
                  <button className="danger-button" onClick={() => onDelete(minutes.id)}>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function MinutesForm({ minutes, members, onAddMember, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...minutes,
    penyaName: PENYA_NAME,
    presentMembers: presentMembersFor(minutes, members),
    agenda: (minutes.agenda?.length ? minutes.agenda : [emptyAgendaItem()]).map((item) => ({
      ...emptyAgendaItem(),
      ...item,
      voteOptions: item.voteOptions?.length ? item.voteOptions : [emptyVoteOption(), emptyVoteOption()],
    })),
  }));
  const [newMember, setNewMember] = useState('');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateAgenda = (id, field, value) => {
    setForm((current) => ({
      ...current,
      agenda: current.agenda.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };
  const toggleMember = (member) => {
    setForm((current) => ({
      ...current,
      presentMembers: {
        ...current.presentMembers,
        [member]: !current.presentMembers?.[member],
      },
    }));
  };
  const addMember = () => {
    const member = newMember.trim();
    if (!member) return;
    onAddMember(member);
    setForm((current) => ({
      ...current,
      presentMembers: {
        ...current.presentMembers,
        [member]: true,
      },
    }));
    setNewMember('');
  };
  const updateVoteOption = (itemId, optionId, field, value) => {
    setForm((current) => ({
      ...current,
      agenda: current.agenda.map((item) =>
        item.id === itemId
          ? {
              ...item,
              voteOptions: item.voteOptions.map((option) =>
                option.id === optionId ? { ...option, [field]: value } : option
              ),
            }
          : item
      ),
    }));
  };
  const addVoteOption = (itemId) => {
    setForm((current) => ({
      ...current,
      agenda: current.agenda.map((item) =>
        item.id === itemId ? { ...item, voteOptions: [...item.voteOptions, emptyVoteOption()] } : item
      ),
    }));
  };
  const removeVoteOption = (itemId, optionId) => {
    setForm((current) => ({
      ...current,
      agenda: current.agenda.map((item) =>
        item.id === itemId
          ? { ...item, voteOptions: item.voteOptions.filter((option) => option.id !== optionId) }
          : item
      ),
    }));
  };

  const addAgendaItem = () => setForm((current) => ({ ...current, agenda: [...current.agenda, emptyAgendaItem()] }));
  const removeAgendaItem = (id) => {
    setForm((current) => {
      const agenda = current.agenda.filter((item) => item.id !== id);
      return { ...current, agenda: agenda.length ? agenda : [emptyAgendaItem()] };
    });
  };

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <form className="form-screen" onSubmit={submit}>
      <div className="form-topbar">
        <button type="button" className="ghost-button" onClick={onCancel}>Tornar</button>
      </div>

      <header className="form-header">
        <p className="eyebrow">Acta de reunio</p>
        <h1>{titleForMinutes(form)}</h1>
      </header>

      <fieldset>
        <legend>Dades generals</legend>
        <Input label="Numero d'acta" value={form.meetingNumber} onChange={(value) => update('meetingNumber', value)} />
        <div className="grid-two">
          <Input type="date" label="Data" value={form.date} onChange={(value) => update('date', value)} />
          <Input type="time" label="Hora inici" value={form.startTime} onChange={(value) => update('startTime', value)} />
          <Input type="time" label="Hora final" value={form.endTime} onChange={(value) => update('endTime', value)} />
          <Input label="Lloc" value={form.location} onChange={(value) => update('location', value)} />
        </div>
        <Input label="President/a de la reunio" value={form.president} onChange={(value) => update('president', value)} />
        <Input label="Secretari/a" value={form.secretary} onChange={(value) => update('secretary', value)} />
      </fieldset>

      <fieldset>
        <legend>Assistents</legend>
        <div className="add-member-row">
          <label className="field">
            <span>Nou membre</span>
            <input value={newMember} onChange={(event) => setNewMember(event.target.value)} />
          </label>
          <button type="button" className="secondary-button" onClick={addMember}>Afegir</button>
        </div>
        <div className="member-list">
          {membersForMinutes(form, members).map((member) => (
            <label className="member-check" key={member}>
              <input
                type="checkbox"
                checked={Boolean(form.presentMembers?.[member])}
                onChange={() => toggleMember(member)}
              />
              <span>{member}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Ordre del dia</legend>
        {form.agenda.map((item, index) => (
          <section className="agenda-item" key={item.id}>
            <div className="agenda-heading">
              <h2>Punt {index + 1}</h2>
              {form.agenda.length > 1 && (
                <button type="button" className="danger-button" onClick={() => removeAgendaItem(item.id)}>Treure</button>
              )}
            </div>
            <Input label="Titol del punt" value={item.title} onChange={(value) => updateAgenda(item.id, 'title', value)} />
            <Textarea label="Explicacio / comentaris" value={item.discussion} onChange={(value) => updateAgenda(item.id, 'discussion', value)} />
            <label className="vote-toggle">
              <input
                type="checkbox"
                checked={Boolean(item.hasVote)}
                onChange={(event) => updateAgenda(item.id, 'hasVote', event.target.checked)}
              />
              <span>Afegir votacio</span>
            </label>
            {item.hasVote && (
              <div className="vote-box">
                {item.voteOptions.map((option) => (
                  <div className="vote-row" key={option.id}>
                    <Input label="Opcio" value={option.label} onChange={(value) => updateVoteOption(item.id, option.id, 'label', value)} />
                    <Input
                      type="number"
                      label="Vots"
                      value={option.votes}
                      onChange={(value) => updateVoteOption(item.id, option.id, 'votes', value)}
                    />
                    {item.voteOptions.length > 1 && (
                      <button type="button" className="danger-button small-button" onClick={() => removeVoteOption(item.id, option.id)}>
                        Treure
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="secondary-button" onClick={() => addVoteOption(item.id)}>Afegir opcio</button>
              </div>
            )}
          </section>
        ))}
        <button type="button" className="secondary-button" onClick={addAgendaItem}>Afegir punt</button>
      </fieldset>

      <div className="sticky-actions">
        <button type="submit" className="primary-button">Guardar acta</button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
