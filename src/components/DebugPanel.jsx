import React, { useState, useEffect, useRef } from 'react';

/**
 * Diagnostic panel to capture and display mobile typing input events in real time.
 * 
 * Displays:
 * - Current Engine State (credited index, typed text, expected char, wrong count, error status)
 * - Current DOM Input State (DOM value, selection/cursor range, composition status)
 * - Event Log table showing every browser event in sequence:
 *   - Timestamp
 *   - Event Type (beforeInput, input/onChange, compositionStart/Update/End, keydown)
 *   - Browser DOM Value & Character Codes
 *   - Previous accepted text & index
 *   - Expected character & code
 *   - Received text / diff
 *   - Composition status
 *   - Validation result & exact rejection reason
 */
export function DebugPanel({ debugLogRef, debugTick, typingState, inputRef }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logContainerRef = useRef(null);

  const logs = debugLogRef?.current || [];

  useEffect(() => {
    if (isAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [debugTick, isAutoScroll]);

  const currentDomVal = inputRef?.current?.value ?? '(none)';
  const currentExpected = typingState?.passage?.[typingState?.credited] ?? '(done)';

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#0a0e17',
        border: '2px solid #00f3ff',
        borderRadius: '8px',
        color: '#e0f7fa',
        fontFamily: 'monospace',
        fontSize: '11px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 0 15px rgba(0, 243, 255, 0.25)',
      }}
      id="mobile-debug-panel"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e3a5f',
          paddingBottom: '8px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#00f3ff', letterSpacing: '1px' }}>
          🛠️ INPUT DIAGNOSTICS ({logs.length} events)
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              if (debugLogRef) debugLogRef.current = [];
              if (inputRef?.current) inputRef.current.value = '';
            }}
            style={{
              background: '#2a1a3a',
              border: '1px solid #ff0055',
              color: '#ff88aa',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            Clear Log
          </button>
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            style={{
              background: isAutoScroll ? '#003b46' : '#222',
              border: '1px solid #00f3ff',
              color: '#00f3ff',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            {isAutoScroll ? 'AutoScroll: ON' : 'AutoScroll: OFF'}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: '#1e293b',
              border: '1px solid #64748b',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            {isOpen ? 'Minimize' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Live State Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '6px',
          padding: '6px',
          backgroundColor: '#0d1527',
          borderRadius: '4px',
          marginBottom: '8px',
          border: '1px solid #1f2d4d',
        }}
      >
        <div>
          <span style={{ color: '#8892b0' }}>DOM Value: </span>
          <span style={{ color: '#ffd166', fontWeight: 'bold' }}>
            {JSON.stringify(currentDomVal)}
          </span>
        </div>
        <div>
          <span style={{ color: '#8892b0' }}>Engine Typed: </span>
          <span style={{ color: '#06d6a0', fontWeight: 'bold' }}>
            {JSON.stringify(typingState?.typed ?? '')}
          </span>
        </div>
        <div>
          <span style={{ color: '#8892b0' }}>Credited Idx: </span>
          <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>
            {typingState?.credited ?? 0}
          </span>
        </div>
        <div>
          <span style={{ color: '#8892b0' }}>Expected Char: </span>
          <span style={{ color: '#ff007f', fontWeight: 'bold' }}>
            {JSON.stringify(currentExpected)} ({currentExpected.charCodeAt(0) || '—'})
          </span>
        </div>
        <div>
          <span style={{ color: '#8892b0' }}>Wrong Count: </span>
          <span style={{ color: typingState?.wrongCount ? '#ff3366' : '#8892b0', fontWeight: 'bold' }}>
            {typingState?.wrongCount ?? 0}
          </span>
        </div>
        <div>
          <span style={{ color: '#8892b0' }}>Status: </span>
          <span
            style={{
              color: typingState?.isError ? '#ff3366' : '#06d6a0',
              fontWeight: 'bold',
            }}
          >
            {typingState?.isError ? 'ERROR' : 'LOCKED'}
          </span>
        </div>
      </div>

      {isOpen && (
        <div
          ref={logContainerRef}
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            overflowX: 'auto',
            border: '1px solid #162a45',
            borderRadius: '4px',
            backgroundColor: '#050a14',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '10px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#0f1d33', color: '#7dd3fc', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>#</th>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>Event</th>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>DOM val [codes]</th>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>Prev Typed (idx)</th>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>Diff / Input</th>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>Expected [code]</th>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>Comp?</th>
                <th style={{ padding: '4px 6px', borderBottom: '1px solid #1e3a5f' }}>Validation Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    No events captured yet. Tap typing area and start typing on mobile keyboard.
                  </td>
                </tr>
              ) : (
                logs.map((entry, idx) => {
                  const isErr = entry.result && (entry.result.startsWith('ERR') || entry.result.startsWith('REJECTED'));
                  const isOk = entry.result && entry.result.startsWith('OK');

                  const formatCodes = (str) =>
                    str ? '[' + [...str].map((c) => c.charCodeAt(0)).join(',') + ']' : '';

                  return (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#060d1a' : '#081224',
                        borderBottom: '1px solid #0f1d33',
                        color: isErr ? '#ff7b72' : isOk ? '#7ee787' : '#c9d1d9',
                      }}
                    >
                      <td style={{ padding: '3px 6px', color: '#56657a' }}>{idx + 1}</td>
                      <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>
                        <span
                          style={{
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor:
                              entry.evt === 'onChange'
                                ? '#1d3557'
                                : entry.evt === 'beforeInput'
                                ? '#4a154b'
                                : entry.evt.startsWith('comp')
                                ? '#2e1065'
                                : '#1e293b',
                            color: '#fff',
                          }}
                        >
                          {entry.evt}
                          {entry.inputType ? ` (${entry.inputType})` : ''}
                          {entry.key ? ` [${entry.key}]` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '3px 6px', wordBreak: 'break-all' }}>
                        {entry.domVal !== undefined ? (
                          <>
                            <span style={{ color: '#ffd166' }}>{JSON.stringify(entry.domVal)}</span>{' '}
                            <span style={{ color: '#8892b0', fontSize: '9px' }}>{formatCodes(entry.domVal)}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '3px 6px' }}>
                        {entry.engineTypedBefore !== undefined ? (
                          <>
                            {JSON.stringify(entry.engineTypedBefore)} ({entry.creditedBefore ?? 0})
                          </>
                        ) : entry.engineTyped !== undefined ? (
                          JSON.stringify(entry.engineTyped)
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>
                        {entry.appended ? (
                          <>
                            <span style={{ color: '#38bdf8' }}>{JSON.stringify(entry.appended)}</span>{' '}
                            <span style={{ color: '#8892b0', fontSize: '9px' }}>{formatCodes(entry.appended)}</span>
                          </>
                        ) : entry.data !== undefined ? (
                          <>
                            <span style={{ color: '#c084fc' }}>{JSON.stringify(entry.data)}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '3px 6px' }}>
                        {entry.expectedChar !== undefined ? (
                          <>
                            <span style={{ color: '#f43f5e' }}>{JSON.stringify(entry.expectedChar)}</span>{' '}
                            <span style={{ color: '#8892b0', fontSize: '9px' }}>[{entry.expectedCharCode}]</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                        {entry.composing ? (
                          <span style={{ color: '#eab308', fontWeight: 'bold' }}>YES</span>
                        ) : (
                          <span style={{ color: '#475569' }}>no</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '3px 6px',
                          fontWeight: 'bold',
                          color: isErr ? '#ff4d4d' : isOk ? '#22c55e' : '#94a3b8',
                        }}
                      >
                        {entry.result || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
