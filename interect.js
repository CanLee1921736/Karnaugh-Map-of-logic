// =========================================
// 1. 全局常量定義
// =========================================

// 4變數 K-map 的 Gray Code 掃描順序映射 (Minterm Index)
const GRAY_CODE_MAP = [0, 1, 3, 2, 4, 5, 7, 6, 12, 13, 15, 14, 8, 9, 11, 10];

// 分組圈選框的顏色庫
const GROUP_COLORS = [
    '#ef4444', // Red
    '#22c55e', // Green
    '#eab308', // Yellow
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#14b8a6' // Teal
];

document.addEventListener('DOMContentLoaded', () => {
    const varSelect = document.getElementById('var-select');
    const grid = document.getElementById('kmap-grid');
    const btnClear = document.getElementById('btn-clear');
    const btnSolve = document.getElementById('btn-solve');
    const sopResult = document.getElementById('sop-result');
    const algebraicProcess = document.getElementById('algebraic-process');

    // 初始化頁面
    initMap();

    // 監聽變數選擇切換
    varSelect.addEventListener('change', initMap);

    // 點擊化簡按鈕
    btnSolve.addEventListener('click', solveKMap);

    // 清空按鈕
    btnClear.addEventListener('click', () => {
        document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('active'));
        document.querySelectorAll('.group-overlay').forEach(el => el.remove());
        sopResult.innerText = "等待輸入...";
        algebraicProcess.innerHTML = "請在上方地圖選取 Minterms 並點擊「開始化簡」。";
    });

    // =========================================
    // 2. 地圖生成與標籤邏輯
    // =========================================

    function initMap() {
        const numVars = parseInt(varSelect.value);
        grid.innerHTML = '';
        document.querySelectorAll('.group-overlay').forEach(el => el.remove());

        const cols = (numVars === 2) ? 2 : 4;
        grid.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;

        createCells(numVars);
        drawLabels(numVars);
        updateReferenceTable(numVars);
    }

    function createCells(numVars) {
        const count = Math.pow(2, numVars);
        let mapping = [];
        if (count === 4) mapping = [0, 1, 2, 3];
        else if (count === 8) mapping = [0, 1, 3, 2, 4, 5, 7, 6];
        else mapping = GRAY_CODE_MAP;

        mapping.forEach((mintermIndex) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = mintermIndex;

            const indexLabel = document.createElement('span');
            indexLabel.className = 'cell-index';
            indexLabel.innerText = mintermIndex;
            cell.appendChild(indexLabel);

            cell.addEventListener('click', () => {
                cell.classList.toggle('active');
            });
            grid.appendChild(cell);
        });
    }

    function drawLabels(numVars) {
        const top = document.getElementById('top-label');
        const left = document.getElementById('left-label');
        const cornerCD = document.querySelector('.kmap-corner .var-cd');
        const cornerAB = document.querySelector('.kmap-corner .var-ab');

        const gray4 = ["00", "01", "11", "10"];
        const gray2 = ["0", "1"];

        top.innerHTML = "";
        left.innerHTML = "";

        if (numVars == 4) {
            cornerCD.innerText = "CD";
            cornerAB.innerText = "AB";
            top.style.gridTemplateColumns = "repeat(4, var(--cell-size))";
            ["C'D'", "C'D", "CD", "CD'"].forEach((text, i) => {
                top.innerHTML += `<div><span style="color:var(--primary-color)">${text}</span>${gray4[i]}</div>`;
            });
            left.style.gridTemplateRows = "repeat(4, var(--cell-size))";
            ["A'B'", "A'B", "AB", "AB'"].forEach((text, i) => {
                left.innerHTML += `<div><span style="color:var(--primary-color)">${text}</span>${gray4[i]}</div>`;
            });
        } else if (numVars == 3) {
            cornerCD.innerText = "BC";
            cornerAB.innerText = "A";
            top.style.gridTemplateColumns = "repeat(4, var(--cell-size))";
            ["B'C'", "B'C", "BC", "BC'"].forEach((text, i) => {
                top.innerHTML += `<div><span style="color:var(--primary-color)">${text}</span>${gray4[i]}</div>`;
            });
            left.style.gridTemplateRows = "repeat(2, var(--cell-size))";
            ["A'", "A"].forEach((text, i) => {
                left.innerHTML += `<div><span style="color:var(--primary-color)">${text}</span>${gray2[i]}</div>`;
            });
        } else {
            cornerCD.innerText = "B";
            cornerAB.innerText = "A";
            top.style.gridTemplateColumns = "repeat(2, var(--cell-size))";
            ["B'", "B"].forEach((text, i) => {
                top.innerHTML += `<div><span style="color:var(--primary-color)">${text}</span>${gray2[i]}</div>`;
            });
            left.style.gridTemplateRows = "repeat(2, var(--cell-size))";
            ["A'", "A"].forEach((text, i) => {
                left.innerHTML += `<div><span style="color:var(--primary-color)">${text}</span>${gray2[i]}</div>`;
            });
        }
    }

    // =========================================
    // 3. 右側 Gray Code 與 State 對照表
    // =========================================

    function updateReferenceTable(numVars) {
        const tbody = document.querySelector('#reference-table tbody');
        if (!tbody) return;
        tbody.innerHTML = "";

        const rowCount = Math.pow(2, numVars);
        const vars = ['A', 'B', 'C', 'D'].slice(0, numVars);

        for (let i = 0; i < rowCount; i++) {
            let binary = i.toString(2).padStart(numVars, '0');
            let gray = (i ^ (i >> 1)).toString(2).padStart(numVars, '0');
            let stateStr = "";
            for (let j = 0; j < numVars; j++) {
                stateStr += vars[j] + (binary[j] === '0' ? "'" : "");
            }

            tbody.innerHTML += `
                <tr>
                    <td>${i}</td>
                    <td style="font-family: monospace;">${binary}</td>
                    <td>${stateStr}</td>
                    <td style="font-family: monospace;">${gray}</td>
                </tr>`;
        }
    }

    // =========================================
    // 4. 化簡核心邏輯 (Quine-McCluskey)
    // =========================================

    function solveKMap() {
        const numVars = parseInt(varSelect.value);
        const activeCells = document.querySelectorAll('.cell.active');
        const minterms = Array.from(activeCells).map(cell => parseInt(cell.dataset.index)).sort((a, b) => a - b);

        if (minterms.length === 0) {
            sopResult.innerText = "0";
            algebraicProcess.innerHTML = "無選取項，輸出恆為 0。";
            document.querySelectorAll('.group-overlay').forEach(el => el.remove());
            return;
        }
        if (minterms.length === Math.pow(2, numVars)) {
            sopResult.innerText = "1";
            algebraicProcess.innerHTML = "全選取項，輸出恆為 1。";
            document.querySelectorAll('.group-overlay').forEach(el => el.remove());
            return;
        }

        const resultSOP = quineMcCluskey(minterms, numVars);
        sopResult.innerText = resultSOP.expression;
        generateAlgebraicSteps(minterms, numVars, resultSOP.piDetails);
        visualizeGroups(resultSOP.piDetails, numVars);
    }

    function quineMcCluskey(minterms, numVars) {
        let groups = {};
        minterms.forEach(m => {
            let binary = m.toString(2).padStart(numVars, '0');
            let count = (binary.match(/1/g) || []).length;
            if (!groups[count]) groups[count] = [];
            groups[count].push({ bits: binary, combined: false, origin: [m] });
        });

        let primeImplicants = [];
        let currentGroups = groups;

        while (Object.keys(currentGroups).length > 0) {
            let nextGroups = {};
            let foundMatch = false;
            let keys = Object.keys(currentGroups).sort((a, b) => a - b);

            for (let i = 0; i < keys.length - 1; i++) {
                let groupA = currentGroups[keys[i]];
                let groupB = currentGroups[keys[parseInt(i) + 1]];
                groupA.forEach(itemA => {
                    groupB.forEach(itemB => {
                        let diffIndex = -1,
                            diffCount = 0;
                        for (let j = 0; j < numVars; j++) {
                            if (itemA.bits[j] !== itemB.bits[j]) { diffCount++;
                                diffIndex = j; }
                        }
                        if (diffCount === 1) {
                            foundMatch = true;
                            itemA.combined = true;
                            itemB.combined = true;
                            let newBits = itemA.bits.substring(0, diffIndex) + '-' + itemA.bits.substring(diffIndex + 1);
                            let newOrigin = [...new Set([...itemA.origin, ...itemB.origin])].sort((a, b) => a - b);
                            let count = (newBits.match(/1/g) || []).length;
                            if (!nextGroups[count]) nextGroups[count] = [];
                            if (!nextGroups[count].some(x => x.bits === newBits)) {
                                nextGroups[count].push({ bits: newBits, combined: false, origin: newOrigin });
                            }
                        }
                    });
                });
            }
            Object.values(currentGroups).forEach(g => { g.forEach(item => { if (!item.combined) primeImplicants.push(item); }); });
            if (!foundMatch) break;
            currentGroups = nextGroups;
        }

        const varNames = (numVars === 2) ? ['A', 'B'] : (numVars === 3) ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
        let finalTerms = primeImplicants.map(pi => {
            let term = "";
            for (let i = 0; i < numVars; i++) {
                if (pi.bits[i] === '1') term += varNames[i];
                else if (pi.bits[i] === '0') term += varNames[i] + "'";
            }
            return { text: term || "1", bits: pi.bits, origin: pi.origin };
        });

        let uniqueTerms = [];
        let seenBits = new Set();
        finalTerms.forEach(t => { if (!seenBits.has(t.bits)) { uniqueTerms.push(t);
                seenBits.add(t.bits); } });
        return { expression: uniqueTerms.map(t => t.text).join(' + '), piDetails: uniqueTerms };
    }

    function generateAlgebraicSteps(minterms, numVars, piDetails) {
        const getTS = (val) => {
            let bin = val.toString(2).padStart(numVars, '0');
            let res = "";
            const vNames = (numVars === 2) ? ['A', 'B'] : (numVars === 3) ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
            for (let i = 0; i < numVars; i++) res += vNames[i] + (bin[i] === '0' ? "'" : "");
            return res;
        };

        let html = `<strong>1. 原始 Minterms 表達式:</strong><br>F = ` + minterms.map(m => getTS(m)).join(' + ') + `<br><br>`;
        html += `<strong>2. 質項合併過程:</strong><br>`;
        piDetails.forEach(pi => {
            if (pi.origin.length > 1) {
                html += `• {${pi.origin.join(',')}}: ${pi.origin.map(m => getTS(m)).join(' + ')} <br> &nbsp;&nbsp;→ 簡化為：<strong>${pi.text}</strong><br>`;
            } else {
                html += `• {${pi.origin[0]}}: 無法合併，保留 <strong>${pi.text}</strong><br>`;
            }
        });
        html += `<br><strong>3. 最終化簡結果 (SOP):</strong><br><strong>${sopResult.innerText}</strong>`;
        algebraicProcess.innerHTML = html;
    }

    // =========================================
    // 5. 視覺化分組 (Group Overlays & Wraparound)
    // =========================================

    function visualizeGroups(piDetails, numVars) {
        document.querySelectorAll('.group-overlay').forEach(el => el.remove());
        const offsetTop = 60,
            offsetLeft = 90,
            cellSize = 60;

        piDetails.forEach((pi, index) => {
            const cells = Array.from(document.querySelectorAll('.cell'))
                .filter(c => pi.origin.includes(parseInt(c.dataset.index)));

            const gridRect = grid.getBoundingClientRect();
            const coords = cells.map(c => {
                const r = c.getBoundingClientRect();
                return { r: Math.round((r.top - gridRect.top) / cellSize), c: Math.round((r.left - gridRect.left) / cellSize) };
            });

            const rows = coords.map(c => c.r),
                cols = coords.map(c => c.c);
            const minR = Math.min(...rows),
                maxR = Math.max(...rows),
                minC = Math.min(...cols),
                maxC = Math.max(...cols);
            const rSpan = maxR - minR + 1,
                cSpan = maxC - minC + 1;
            const totalRows = (numVars === 2) ? 2 : (numVars === 3) ? 2 : 4;
            const totalCols = (numVars === 2) ? 2 : 4;

            const isRowWrap = (pi.origin.length <= (Math.pow(2, numVars) / 2)) && (rSpan === totalRows) && rSpan > 1;
            const isColWrap = (pi.origin.length <= (Math.pow(2, numVars) / 2)) && (cSpan === totalCols) && cSpan > 1;
            const color = GROUP_COLORS[index % GROUP_COLORS.length];

            if (isRowWrap || isColWrap) {
                drawWraparound(minR, maxR, minC, maxC, isRowWrap, isColWrap, offsetTop, offsetLeft, cellSize, color);
            } else {
                const overlay = document.createElement('div');
                overlay.className = 'group-overlay';
                Object.assign(overlay.style, {
                    top: offsetTop + (minR * cellSize) + 'px',
                    left: offsetLeft + (minC * cellSize) + 'px',
                    width: (cSpan * cellSize) + 'px',
                    height: (rSpan * cellSize) + 'px',
                    borderColor: color,
                    backgroundColor: hexToRgba(color, 0.1)
                });
                document.querySelector('.kmap-container').appendChild(overlay);
            }
        });
    }

    function drawWraparound(minR, maxR, minC, maxC, isRowWrap, isColWrap, ot, ol, cs, color) {
        const over = 10;
        const create = (s) => {
            const el = document.createElement('div');
            el.className = 'group-overlay wraparound';
            Object.assign(el.style, { borderColor: color, ...s });
            document.querySelector('.kmap-container').appendChild(el);
        };

        if (isColWrap && !isRowWrap) {
            create({ top: ot + minR * cs + 'px', left: ol + maxC * cs - over + 'px', width: cs + over * 2 + 'px', height: (maxR - minR + 1) * cs + 'px', borderLeft: 'none', borderRadius: '0 15px 15px 0' });
            create({ top: ot + minR * cs + 'px', left: ol + minC * cs - over + 'px', width: cs + over * 2 + 'px', height: (maxR - minR + 1) * cs + 'px', borderRight: 'none', borderRadius: '15px 0 0 15px' });
        } else if (isRowWrap && !isColWrap) {
            create({ top: ot + minR * cs - over + 'px', left: ol + minC * cs + 'px', width: (maxC - minC + 1) * cs + 'px', height: cs + over * 2 + 'px', borderTop: 'none', borderRadius: '0 0 15px 15px' });
            create({ top: ot + maxR * cs - over + 'px', left: ol + minC * cs + 'px', width: (maxC - minC + 1) * cs + 'px', height: cs + over * 2 + 'px', borderBottom: 'none', borderRadius: '15px 15px 0 0' });
        } else if (isRowWrap && isColWrap) {
            [{ r: 0, c: 0, br: '0 0 15px 0' }, { r: 0, c: 3, br: '0 0 0 15px' }, { r: 3, c: 0, br: '0 15px 0 0' }, { r: 3, c: 3, br: '15px 0 0 0' }].forEach(cor => {
                create({ top: ot + cor.r * cs - (cor.r === 0 ? over : cs - over) + 'px', left: ol + cor.c * cs - (cor.c === 0 ? over : cs - over) + 'px', width: cs + over * 2 + 'px', height: cs + over * 2 + 'px', borderRadius: cor.br, borderTop: cor.r === 3 ? 'none' : '', borderBottom: cor.r === 0 ? 'none' : '', borderLeft: cor.c === 3 ? 'none' : '', borderRight: cor.c === 0 ? 'none' : '' });
            });
        }
    }

    function hexToRgba(hex, opacity) {
        const r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
});