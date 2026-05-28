/* Interactive Dependency Engine for CMU CS Course Tree (204xxx) */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const viewport = document.getElementById('viewport');
    const canvasContainer = document.getElementById('canvas-container');
    const svgConnections = document.getElementById('svg-connections');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const categoryFilter = document.getElementById('category-filter');
    const semesterFilter = document.getElementById('semester-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const clearSelectionBtn = document.getElementById('clear-selection');
    
    // Zoom and Pan buttons
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomFitBtn = document.getElementById('zoom-fit');

    // Details Drawer Elements
    const drawer = document.getElementById('drawer');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerHeader = document.getElementById('drawer-header');
    const drawerSemesters = document.getElementById('drawer-semesters');
    const descThContent = document.getElementById('desc-th-content');
    const descEnContent = document.getElementById('desc-en-content');
    const drawerClos = document.getElementById('drawer-clos');
    const drawerPrereqs = document.getElementById('drawer-prereqs');
    const drawerPostreqs = document.getElementById('drawer-postreqs');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Version filter element
    const versionFilter = document.getElementById('version-filter');
    const courseMap = new Map();
    let activeCoursesData = [];

    function updateActiveData() {
        const ver = versionFilter ? versionFilter.value : 'after';
        if (ver === 'before') {
            activeCoursesData = coursesDataBefore2569;
        } else {
            activeCoursesData = coursesDataAfter2569;
        }

        courseMap.clear();
        activeCoursesData.forEach(course => {
            courseMap.set(course.id, course);
            course.postrequisites = [];
        });

        activeCoursesData.forEach(course => {
            course.prerequisites.forEach(prereqId => {
                const parent = courseMap.get(prereqId);
                if (parent) {
                    parent.postrequisites.push(course.id);
                }
            });
        });
    }

    // Run initial data load
    updateActiveData();

    // Zoom & Pan State (Fixed to 1.0 for native vertical scrolling layout)
    let zoomScale = 1.0;
    let panX = 0;
    let panY = 0;

    // Selection State
    let selectedCourseId = null;

    // Initialize layout
    initGrid();
    updateTransform();
    
    // Wait a brief moment for DOM layout, then draw lines
    setTimeout(() => {
        drawConnections();
    }, 100);

    // Re-draw connections on window resize
    window.addEventListener('resize', () => {
        drawConnections();
    });

    // ----------------------------------------------------
    // 1. Grid & Node Card Generation
    // ----------------------------------------------------
    function computeSameTierDepths() {
        activeCoursesData.forEach(course => {
            course.sameTierDepth = 0;
        });

        let changed = true;
        for (let pass = 0; pass < 5 && changed; pass++) {
            changed = false;
            activeCoursesData.forEach(course => {
                const tier = course.id.substring(3, 4);
                course.prerequisites.forEach(prereqId => {
                    if (prereqId.startsWith('204')) {
                        const prereqTier = prereqId.substring(3, 4);
                        if (prereqTier === tier) {
                            const parent = courseMap.get(prereqId);
                            if (parent) {
                                const newDepth = parent.sameTierDepth + 1;
                                if (newDepth > course.sameTierDepth) {
                                    course.sameTierDepth = newDepth;
                                    changed = true;
                                }
                            }
                        }
                    }
                });
            });
        }
    }

    function initGrid() {
        computeSameTierDepths();

        // Clear and rebuild nodes containers per sub-row
        for (let t = 1; t <= 4; t++) {
            const col = document.getElementById(`tier-${t}`);
            if (!col) continue;

            // Remove all existing nodes-containers
            const oldContainers = col.querySelectorAll('.nodes-container');
            oldContainers.forEach(el => el.remove());

            // Find max depth for courses in this tier
            const tierCourses = activeCoursesData.filter(c => c.id.substring(3, 4) === String(t));
            const maxDepth = tierCourses.reduce((max, c) => Math.max(max, c.sameTierDepth || 0), 0);

            for (let d = 0; d <= maxDepth; d++) {
                const container = document.createElement('div');
                container.className = 'nodes-container';
                container.id = `tier-${t}-nodes-${d}`;
                if (d > 0) {
                    container.style.borderTop = '1px dashed rgba(255, 255, 255, 0.04)';
                    container.style.paddingTop = '1rem';
                    container.style.marginTop = '0.5rem';
                }
                col.appendChild(container);
            }
        }

        activeCoursesData.forEach(course => {
            const node = document.createElement('div');
            node.className = `course-node ${course.classification}`;
            node.id = `node-${course.id}`;
            node.dataset.id = course.id;

            node.innerHTML = `
                <span class="node-level">Lv${course.credits}</span>
                <div class="node-id">${course.id}</div>
                <div class="node-name" title="${course.name_EN}">${course.name_EN}</div>
            `;

            // Node click event
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCourse(course.id);
            });

            // Distribute into sub-rows based on 2041xx, 2042xx, 2043xx, 2044xx and sameTierDepth
            const tierStr = course.id.substring(3, 4); // index 3 of 6-digit ID (e.g. 204111 -> '1')
            const depth = course.sameTierDepth || 0;
            const containerId = `tier-${tierStr}-nodes-${depth}`;
            const container = document.getElementById(containerId);
            if (container) {
                container.appendChild(node);
            } else {
                const fallback = document.getElementById(`tier-4-nodes-0`);
                if (fallback) fallback.appendChild(node);
            }
        });
    }

    // ----------------------------------------------------
    // 2. SVG Connections Layout Rendering
    // ----------------------------------------------------
    function drawConnections() {
        svgConnections.innerHTML = '';
        const canvasRect = canvasContainer.getBoundingClientRect();

        activeCoursesData.forEach(course => {
            const targetNode = document.getElementById(`node-${course.id}`);
            if (!targetNode || targetNode.classList.contains('hidden')) return;

            course.prerequisites.forEach(prereqId => {
                const sourceNode = document.getElementById(`node-${prereqId}`);
                if (!sourceNode || sourceNode.classList.contains('hidden')) return;

                // Source node coordinates (bottom center of prerequisite card)
                const sourceRect = sourceNode.getBoundingClientRect();
                const x1 = (sourceRect.left + sourceRect.width / 2 - canvasRect.left) / zoomScale;
                const y1 = (sourceRect.bottom - canvasRect.top) / zoomScale;

                // Target node coordinates (top center of current card)
                const targetRect = targetNode.getBoundingClientRect();
                const x2 = (targetRect.left + targetRect.width / 2 - canvasRect.left) / zoomScale;
                const y2 = (targetRect.top - canvasRect.top) / zoomScale;

                // Orthogonal path drawing (Ragnarok Online style)
                let pathData;
                if (y2 > y1 + 10) {
                    const dy = (y2 - y1) / 2;
                    pathData = `M ${x1} ${y1} L ${x1} ${y1 + dy} L ${x2} ${y1 + dy} L ${x2} ${y2}`;
                } else {
                    // Sideways/Backwards path loop
                    pathData = `M ${x1} ${y1} L ${x1} ${y1 + 25} L ${x2} ${y1 + 25} L ${x2} ${y2}`;
                }

                // Create SVG path element
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('class', 'conn-path');
                path.setAttribute('id', `conn-${prereqId}-${course.id}`);
                path.dataset.from = prereqId;
                path.dataset.to = course.id;

                svgConnections.appendChild(path);
            });
        });

        // Apply connection states matching active selections
        if (selectedCourseId) {
            highlightConnectionPaths(selectedCourseId);
        }
    }

    // ----------------------------------------------------
    // 3. Dependency Path Calculation & Highlights
    // ----------------------------------------------------
    function selectCourse(courseId) {
        if (selectedCourseId === courseId) {
            clearSelection();
            return;
        }

        selectedCourseId = courseId;
        clearSelectionBtn.classList.remove('hidden');

        // Reset visual classes
        document.querySelectorAll('.course-node').forEach(node => {
            node.classList.remove('selected-active', 'highlight-prereq', 'highlight-postreq', 'dimmed');
        });
        document.querySelectorAll('.conn-path').forEach(path => {
            path.classList.remove('highlight-prereq', 'highlight-postreq', 'dimmed');
        });

        // Highlight selected node
        const activeNode = document.getElementById(`node-${courseId}`);
        if (activeNode) {
            activeNode.classList.add('selected-active');
        }

        // Compute direct and indirect dependencies
        const prereqs = new Set();
        const postreqs = new Set();

        function collectPrereqs(cid) {
            const c = courseMap.get(cid);
            if (!c) return;
            c.prerequisites.forEach(pid => {
                if (!prereqs.has(pid)) {
                    prereqs.add(pid);
                    collectPrereqs(pid);
                }
            });
        }

        function collectPostreqs(cid) {
            const c = courseMap.get(cid);
            if (!c) return;
            c.postrequisites.forEach(pid => {
                if (!postreqs.has(pid)) {
                    postreqs.add(pid);
                    collectPostreqs(pid);
                }
            });
        }

        collectPrereqs(courseId);
        collectPostreqs(courseId);

        // Apply highlighted CSS classes to cards
        activeCoursesData.forEach(course => {
            const node = document.getElementById(`node-${course.id}`);
            if (!node) return;

            if (course.id === courseId) return; // Keep selected active state

            if (prereqs.has(course.id)) {
                node.classList.add('highlight-prereq');
            } else if (postreqs.has(course.id)) {
                node.classList.add('highlight-postreq');
            } else {
                node.classList.add('dimmed');
            }
        });

        // Apply path highlight visual classes
        highlightConnectionPaths(courseId, prereqs, postreqs);

        // Open details panel
        openDrawer(courseId);
    }

    function highlightConnectionPaths(courseId, prereqs = null, postreqs = null) {
        if (!prereqs || !postreqs) {
            prereqs = new Set();
            postreqs = new Set();

            function collectPrereqs(cid) {
                const c = courseMap.get(cid);
                if (!c) return;
                c.prerequisites.forEach(pid => {
                    if (!prereqs.has(pid)) {
                        prereqs.add(pid);
                        collectPrereqs(pid);
                    }
                });
            }

            function collectPostreqs(cid) {
                const c = courseMap.get(cid);
                if (!c) return;
                c.postrequisites.forEach(pid => {
                    if (!postreqs.has(pid)) {
                        postreqs.add(pid);
                        collectPostreqs(pid);
                    }
                });
            }

            collectPrereqs(courseId);
            collectPostreqs(courseId);
        }

        document.querySelectorAll('.conn-path').forEach(path => {
            const from = path.dataset.from;
            const to = path.dataset.to;

            // Highlight prerequisite path: connections where target (to) is either the selected course
            // or one of its highlighted prerequisites, AND the source (from) is a prerequisite
            if ((to === courseId || prereqs.has(to)) && prereqs.has(from)) {
                path.classList.add('highlight-prereq');
            }
            // Highlight postrequisite path: connections where source (from) is either the selected course
            // or one of its highlighted postrequisites, AND the target (to) is a postrequisite
            else if ((from === courseId || postreqs.has(from)) && postreqs.has(to)) {
                path.classList.add('highlight-postreq');
            } 
            // Path immediately leading to selected node
            else if (to === courseId && prereqs.has(from)) {
                path.classList.add('highlight-prereq');
            }
            else if (from === courseId && postreqs.has(to)) {
                path.classList.add('highlight-postreq');
            }
            else {
                path.classList.add('dimmed');
            }
        });
    }

    function clearSelection() {
        selectedCourseId = null;
        clearSelectionBtn.classList.add('hidden');

        document.querySelectorAll('.course-node').forEach(node => {
            node.classList.remove('selected-active', 'highlight-prereq', 'highlight-postreq', 'dimmed');
        });
        document.querySelectorAll('.conn-path').forEach(path => {
            path.classList.remove('highlight-prereq', 'highlight-postreq', 'dimmed');
        });

        closeDrawer();
    }

    // ----------------------------------------------------
    // 4. Zoom & Pan Controllers (Disabled)
    // ----------------------------------------------------
    function updateTransform() {
        // Native scroll layout is active, transform not needed
        canvasContainer.style.transform = `none`;
    }

    // ----------------------------------------------------
    // 5. Drawer & Content Renderer
    // ----------------------------------------------------
    function openDrawer(courseId) {
        const course = courseMap.get(courseId);
        if (!course) return;

        // Render header
        const classLabels = {
            'core': 'วิชาแกน (Core Course)',
            'compulsory': 'วิชาเอกบังคับ (Compulsory Course)',
            'project-elective': 'วิชาเอกเลือกทำโครงงาน (Project Elective)',
            'non-project-elective': 'วิชาเอกเลือกไม่ทำโครงงาน (Non-project Elective)',
            'other': 'วิชาอื่นๆ / General Education'
        };
        const classLabel = classLabels[course.classification] || 'วิชาอื่นๆ';

        drawerHeader.innerHTML = `
            <span class="course-type-tag ${course.classification}">${classLabel}</span>
            <h2>${course.id}</h2>
            <div class="credits-text">${course.name_TH}</div>
            <div class="credits-text" style="font-size:0.95rem; opacity:0.8; font-style:italic;">${course.name_EN}</div>
            <div class="credits-text" style="margin-top:0.4rem; font-weight:600; color:var(--text-primary); font-size:0.8rem;">
                Credits: ${course.credits}
            </div>
        `;

        // Render offered semesters
        const sem1Active = course.terms.t1 || course.terms.label === '1' || course.terms.label === 'yearly';
        const sem2Active = course.terms.t2 || course.terms.label === '2' || course.terms.label === 'yearly';
        
        drawerSemesters.innerHTML = `
            <div class="sem-badge ${sem1Active ? 'active' : ''}">Semester 1</div>
            <div class="sem-badge ${sem2Active ? 'active' : ''}">Semester 2</div>
        `;

        // Render Description contents
        descThContent.innerHTML = course.desc_TH || '<p class="dep-empty">ไม่มีคำอธิบายรายวิชาภาษาไทย</p>';
        descEnContent.innerHTML = course.desc_EN || '<p class="dep-empty">No English course description available</p>';

        // Render CLOs list
        drawerClos.innerHTML = '';
        const clos = course.CLOs_TH.length > 0 ? course.CLOs_TH : course.CLOs_EN;
        if (clos && clos.length > 0) {
            clos.forEach((clo, idx) => {
                const cloItem = document.createElement('div');
                cloItem.className = 'clo-item';
                cloItem.innerHTML = `
                    <span class="clo-num">CLO ${idx + 1}</span>
                    <span class="clo-text">${clo}</span>
                `;
                drawerClos.appendChild(cloItem);
            });
        } else {
            drawerClos.innerHTML = '<p class="dep-empty">ไม่มีข้อมูลผลลัพธ์การเรียนรู้รายวิชา (CLOs)</p>';
        }

        // Render Prerequisites
        drawerPrereqs.innerHTML = '';
        if (course.prerequisites.length > 0) {
            course.prerequisites.forEach(pid => {
                const prereq = courseMap.get(pid);
                const li = document.createElement('li');
                li.className = 'dep-item-link';
                if (prereq) {
                    li.innerHTML = `
                        <span class="dep-item-code">${pid}</span>
                        <span class="dep-item-title">${prereq.name_TH}</span>
                    `;
                    li.addEventListener('click', () => {
                        selectCourse(pid);
                        focusOnNode(pid);
                    });
                } else {
                    // Out-of-department prerequisite (like 206xxx, 229xxx)
                    li.innerHTML = `
                        <span class="dep-item-code">${pid}</span>
                        <span class="dep-item-title" style="color:var(--text-muted);">External Course</span>
                    `;
                    li.style.cursor = 'default';
                }
                drawerPrereqs.appendChild(li);
            });
        } else {
            drawerPrereqs.innerHTML = '<p class="dep-empty">None (ไม่มี)</p>';
        }

        // Render Postrequisites
        drawerPostreqs.innerHTML = '';
        if (course.postrequisites.length > 0) {
            course.postrequisites.forEach(pid => {
                const postreq = courseMap.get(pid);
                const li = document.createElement('li');
                li.className = 'dep-item-link';
                if (postreq) {
                    li.innerHTML = `
                        <span class="dep-item-code">${pid}</span>
                        <span class="dep-item-title">${postreq.name_TH}</span>
                    `;
                    li.addEventListener('click', () => {
                        selectCourse(pid);
                        focusOnNode(pid);
                    });
                } else {
                    li.innerHTML = `
                        <span class="dep-item-code">${pid}</span>
                        <span class="dep-item-title">${pid}</span>
                    `;
                }
                drawerPostreqs.appendChild(li);
            });
        } else {
            drawerPostreqs.innerHTML = '<p class="dep-empty">None (ไม่มี)</p>';
        }

        // Slide drawer in
        drawer.classList.add('open');
    }

    function closeDrawer() {
        drawer.classList.remove('open');
    }

    // Focuses and centers layout viewport on a node card using native scrolling
    function focusOnNode(courseId) {
        const node = document.getElementById(`node-${courseId}`);
        if (!node) return;

        const viewportRect = viewport.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const targetScrollTop = viewport.scrollTop + (nodeRect.top + nodeRect.height/2 - viewportRect.top - viewportRect.height/2);
        viewport.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }

    // Tab buttons functionality
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });

    closeDrawerBtn.addEventListener('click', () => {
        clearSelection();
    });

    // ----------------------------------------------------
    // 6. Search and Filter Engine
    // ----------------------------------------------------
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query) {
            clearSelectionBtn.classList.remove('hidden');
            clearSearchBtn.style.display = 'block';
            
            // Hide connection lines during search to make visual clean
            svgConnections.innerHTML = '';
            
            activeCoursesData.forEach(course => {
                const node = document.getElementById(`node-${course.id}`);
                if (!node) return;

                const match = 
                    course.id.toLowerCase().includes(query) ||
                    course.name_TH.toLowerCase().includes(query) ||
                    course.name_EN.toLowerCase().includes(query) ||
                    (course.desc_TH && course.desc_TH.toLowerCase().includes(query)) ||
                    (course.desc_EN && course.desc_EN.toLowerCase().includes(query));

                if (match) {
                    node.classList.add('search-match');
                    node.classList.remove('search-no-match');
                } else {
                    node.classList.remove('search-match');
                    node.classList.add('search-no-match');
                }
            });
        } else {
            clearSearchBtn.style.display = 'none';
            // Clear matches
            document.querySelectorAll('.course-node').forEach(node => {
                node.classList.remove('search-match', 'search-no-match');
            });
            drawConnections();
        }
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        document.querySelectorAll('.course-node').forEach(node => {
            node.classList.remove('search-match', 'search-no-match');
        });
        if (!selectedCourseId) {
            clearSelectionBtn.classList.add('hidden');
        }
        drawConnections();
    });

    // Apply Filter Selection
    function applyFilters() {
        const catVal = categoryFilter.value;
        const semVal = semesterFilter.value;

        activeCoursesData.forEach(course => {
            const node = document.getElementById(`node-${course.id}`);
            if (!node) return;

            // Category matching
            const matchesCat = (catVal === 'all' || course.classification === catVal);

            // Semester matching
            const sem1Active = course.terms.t1 || course.terms.label === '1' || course.terms.label === 'yearly';
            const sem2Active = course.terms.t2 || course.terms.label === '2' || course.terms.label === 'yearly';
            
            let matchesSem = true;
            if (semVal === 't1') {
                matchesSem = sem1Active;
            } else if (semVal === 't2') {
                matchesSem = sem2Active;
            } else if (semVal === 'both') {
                matchesSem = sem1Active && sem2Active;
            }

            if (matchesCat && matchesSem) {
                node.classList.remove('hidden');
            } else {
                node.classList.add('hidden');
            }
        });

        // Recalculate connection coordinates
        drawConnections();
    }

    categoryFilter.addEventListener('change', applyFilters);
    semesterFilter.addEventListener('change', applyFilters);

    resetFiltersBtn.addEventListener('click', () => {
        categoryFilter.value = 'all';
        semesterFilter.value = 'all';
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.course-node').forEach(node => {
            node.classList.remove('hidden', 'search-match', 'search-no-match');
        });
        
        clearSelection();
        drawConnections();
    });

    clearSelectionBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.course-node').forEach(node => {
            node.classList.remove('hidden', 'search-match', 'search-no-match');
        });
        
        clearSelection();
        drawConnections();
    });

    // Click legend bar filter shortcuts
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            categoryFilter.value = type;
            applyFilters();
        });
    });

    // Version filter change event
    if (versionFilter) {
        versionFilter.addEventListener('change', () => {
            updateActiveData();
            initGrid();
            clearSelection();
            drawConnections();
        });
    }
});
