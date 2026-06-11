/* Interactive Planning & Dependency Engine for CMU CS Course Tree (204xxx) */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const viewport = document.getElementById('viewport');
    const canvasContainer = document.getElementById('canvas-container');
    const svgConnections = document.getElementById('svg-connections');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const pathFilter = document.getElementById('path-filter');
    const minorFilter = document.getElementById('minor-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const clearSelectionBtn = document.getElementById('clear-selection');
    
    // Permanent Sidebar Layout Elements
    const selectedList = document.getElementById('selected-list');
    const shareBtn = document.getElementById('share-btn');
    const detailsPlaceholder = document.getElementById('details-placeholder');
    const detailsContainer = document.getElementById('details-container');
    const detailsPrereqText = document.getElementById('details-prereq-text');
    const toastContainer = document.getElementById('toast-container');

    // Details Panel Elements
    const drawerHeader = document.getElementById('drawer-header');
    const drawerSemesters = document.getElementById('drawer-semesters');
    const descThContent = document.getElementById('desc-th-content');
    const descEnContent = document.getElementById('desc-en-content');
    const drawerClos = document.getElementById('drawer-clos');
    const drawerPostreqs = document.getElementById('drawer-postreqs');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Version filter element
    const versionFilter = document.getElementById('version-filter');
    const courseMap = new Map();
    let activeCoursesData = [];

    // Planning and Selection States
    const selectedElectives = new Set();
    let selectedCourseId = null;
    let zoomScale = 1.0;

    // Curriculum Configuration
    const curriculumRules = {
      "old_coop": {
        required: ["204111", "204114", "204203", "204212", "204231", "204232", "204252", "204271", "204306", "204315", "204321", "204341", "204361", "204390", "204451", "204490", "204496", "204497", "206111", "206112", "206183", "208269"],
        elective: ["204311", "204312", "204322", "204325", "204333", "204335", "204355", "204362", "204363", "204364", "204365", "204371", "204381", "204382", "204383", "204422", "204423", "204424", "204425", "204426", "204432", "204435", "204441", "204442", "204443", "204452", "204453", "204454", "204456", "204471", "204472", "204481", "204482", "204483", "204493", "204494", "204495", "206336", "206370", "206428", "206463", "206476", "206481"]
      },
      "old_project": {
        required: ["204111", "204114", "204203", "204212", "204231", "204232", "204252", "204271", "204306", "204315", "204321", "204341", "204361", "204390", "204451", "204490", "204491", "204499", "206111", "206112", "206183", "208269"],
        elective: ["204311", "204312", "204322", "204325", "204333", "204335", "204355", "204362", "204363", "204364", "204365", "204371", "204381", "204382", "204383", "204422", "204423", "204424", "204425", "204426", "204432", "204435", "204441", "204442", "204443", "204452", "204453", "204454", "204456", "204471", "204472", "204481", "204482", "204483", "204493", "204494", "204495", "206336", "206370", "206428", "206463", "206476", "206481"]
      },
      "new_coop": {
        required: ["204111", "204115", "204212", "204231", "204232", "204255", "204271", "204306", "204315", "204321", "204361", "204451", "204496", "204497", "206111", "206183", "206324", "208269"],
        projectElectives: ["204311", "204312", "204322", "204325", "204333", "204335", "204365", "204382", "204383", "204423", "204424", "204426", "204441", "204453", "204454", "204483", "204493"],
        elective: ["204311", "204312", "204322", "204325", "204333", "204335", "204341", "204355", "204362", "204363", "204364", "204365", "204371", "204381", "204382", "204383", "204422", "204423", "204424", "204425", "204426", "204432", "204435", "204441", "204442", "204443", "204452", "204453", "204454", "204456", "204471", "204472", "204481", "204482", "204483", "204493", "204494", "204495", "206336", "206370", "206428", "206463", "206476", "206481"]
      },
      "new_project": {
        required: ["204111", "204115", "204212", "204231", "204232", "204255", "204271", "204306", "204315", "204321", "204361", "204451", "204497", "206111", "206183", "206324", "208269"],
        projectElectives: ["204311", "204312", "204322", "204325", "204333", "204335", "204365", "204382", "204383", "204423", "204424", "204426", "204441", "204453", "204454", "204483", "204493"],
        elective: ["204311", "204312", "204322", "204325", "204333", "204335", "204341", "204355", "204362", "204363", "204364", "204365", "204371", "204381", "204382", "204383", "204422", "204423", "204424", "204425", "204426", "204432", "204435", "204441", "204442", "204443", "204452", "204453", "204454", "204456", "204471", "204472", "204481", "204482", "204483", "204493", "204494", "204495", "206336", "206370", "206428", "206463", "206476", "206481"]
      }
    };

    const auditRules = {
      "old_coop_non-cs": { total: 12, tier4: 6, project: 0 },
      "old_coop_cs":     { total: 27, tier4: 6, project: 0 },
      "old_project_non-cs": { total: 15, tier4: 9, project: 0 },
      "old_project_cs":     { total: 30, tier4: 9, project: 0 },
      "new_coop_non-cs": { total: 18, tier4: 9, project: 0 },
      "new_coop_cs":     { total: 33, tier4: 6, project: 0 },
      "new_project_non-cs": { total: 27, tier4: 18, project: 15 },
      "new_project_cs":     { total: 42, tier4: 18, project: 15 }
    };

    function updateActiveData() {
        const ver = versionFilter ? versionFilter.value : 'new';
        const path = pathFilter ? pathFilter.value : 'coop';
        const ruleKey = `${ver}_${path}`;
        const rule = curriculumRules[ruleKey];
        const allowedIds = new Set([...rule.required, ...rule.elective]);

        const rawSourceData = ver === 'old' ? coursesDataBefore2569 : coursesDataAfter2569;

        // Filter and clone data
        activeCoursesData = rawSourceData.filter(c => allowedIds.has(c.id)).map(c => {
            const courseCopy = JSON.parse(JSON.stringify(c));
            const isReq = rule.required.includes(c.id);
            if (isReq) {
                if (c.classification !== 'core') {
                    courseCopy.classification = 'compulsory';
                }
            } else {
                if (ver === 'new') {
                    const isProj = rule.projectElectives.includes(c.id);
                    courseCopy.classification = isProj ? 'project-elective' : 'non-project-elective';
                } else {
                    courseCopy.classification = 'elective';
                }
            }
            return courseCopy;
        });

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

    // Initialize layout
    initGrid();
    updateTransform();
    
    // Load selection from URL on startup
    loadSelectionFromURL();
    
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

        // Rebuild Required and Elective panes inside Tier columns
        for (let t = 1; t <= 4; t++) {
            const col = document.getElementById(`tier-${t}`);
            if (!col) continue;

            // Remove existing panes and containers
            const oldPanes = col.querySelector('.tier-panes');
            if (oldPanes) oldPanes.remove();
            
            const oldContainers = col.querySelectorAll('.nodes-container');
            oldContainers.forEach(el => el.remove());

            // Get courses in this tier
            const tierCourses = activeCoursesData.filter(c => c.id.substring(3, 4) === String(t));
            const reqCourses = tierCourses.filter(c => c.classification === 'core' || c.classification === 'compulsory');
            const electCourses = tierCourses.filter(c => c.classification !== 'core' && c.classification !== 'compulsory');

            // Find max depths
            const maxReqDepth = reqCourses.reduce((max, c) => Math.max(max, c.sameTierDepth || 0), 0);
            const maxElectDepth = electCourses.reduce((max, c) => Math.max(max, c.sameTierDepth || 0), 0);

            // Create panes wrapper
            const panesWrapper = document.createElement('div');
            panesWrapper.className = 'tier-panes';

            // 1. Required Pane (Left)
            const reqPane = document.createElement('div');
            reqPane.className = 'tier-pane required-pane';
            reqPane.innerHTML = '<div class="pane-title">Required Courses (วิชาบังคับ/แกน)</div>';
            for (let d = 0; d <= maxReqDepth; d++) {
                const container = document.createElement('div');
                container.className = 'nodes-container';
                container.id = `tier-${t}-required-nodes-${d}`;
                reqPane.appendChild(container);
            }
            panesWrapper.appendChild(reqPane);

            // 2. Electives Pane (Right)
            const electPane = document.createElement('div');
            electPane.className = 'tier-pane elective-pane';
            electPane.innerHTML = '<div class="pane-title">Electives & Others (วิชาเลือก/อื่นๆ)</div>';
            for (let d = 0; d <= maxElectDepth; d++) {
                const container = document.createElement('div');
                container.className = 'nodes-container';
                container.id = `tier-${t}-elective-nodes-${d}`;
                electPane.appendChild(container);
            }
            panesWrapper.appendChild(electPane);

            col.appendChild(panesWrapper);
        }

        // Render course cards into the correct panes & containers
        activeCoursesData.forEach(course => {
            const node = document.createElement('div');
            const isRequired = course.classification === 'core' || course.classification === 'compulsory';
            
            node.className = `course-node ${course.classification}`;
            if (selectedElectives.has(course.id)) {
                node.classList.add('selected-plan');
            }
            node.id = `node-${course.id}`;
            node.dataset.id = course.id;

            // Electives display a +/- button on their card
            let selectBtnHtml = '';
            if (!isRequired) {
                const isSelected = selectedElectives.has(course.id);
                selectBtnHtml = `<button class="node-select-btn" title="${isSelected ? 'Remove from Plan' : 'Add to Plan'}">${isSelected ? '-' : '+'}</button>`;
            }

            node.innerHTML = `
                <span class="node-level">Credit ${course.credits}</span>
                <div class="node-id">${course.id}</div>
                <div class="node-name" title="${course.name_EN}">${course.name_EN}</div>
                ${selectBtnHtml}
            `;

            // Node click event (select and highlight)
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCourse(course.id);
            });

            // Action button click event
            const selectBtn = node.querySelector('.node-select-btn');
            if (selectBtn) {
                selectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleElective(course.id);
                });
            }

            // Append to appropriate pane and depth container
            const tierStr = course.id.substring(3, 4);
            const paneType = isRequired ? 'required' : 'elective';
            const depth = course.sameTierDepth || 0;
            const containerId = `tier-${tierStr}-${paneType}-nodes-${depth}`;
            const container = document.getElementById(containerId);
            
            if (container) {
                container.appendChild(node);
            } else {
                const fallbackId = `tier-${tierStr}-${paneType}-nodes-0`;
                const fallback = document.getElementById(fallbackId);
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

            // Highlight prerequisite path
            if ((to === courseId || prereqs.has(to)) && prereqs.has(from)) {
                path.classList.add('highlight-prereq');
            }
            // Highlight postrequisite path
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

    function updateTransform() {
        canvasContainer.style.transform = `none`;
    }

    // ----------------------------------------------------
    // 4. Recursive Planning Logic
    // ----------------------------------------------------
    function toggleElective(courseId) {
        if (selectedElectives.has(courseId)) {
            removeElectiveFromPlan(courseId);
        } else {
            addElectiveToPlan(courseId);
        }
        updatePlannerUI();
    }

    function addElectiveToPlan(courseId) {
        const course = courseMap.get(courseId);
        if (!course) return;

        const isRequired = course.classification === 'core' || course.classification === 'compulsory';
        const isSatisfied = isRequired || selectedElectives.has(courseId);

        if (isSatisfied) {
            // Already satisfied, do not recurse further
            return;
        }

        // Add elective to plan
        selectedElectives.add(courseId);

        // Recursively select all prerequisites in the active tree
        course.prerequisites.forEach(pid => {
            if (courseMap.has(pid)) {
                addElectiveToPlan(pid);
            }
        });
    }

    function removeElectiveFromPlan(courseId) {
        if (!selectedElectives.has(courseId)) return;
        selectedElectives.delete(courseId);

        // Cascading delete: recursively remove all selected electives that list this course as a prerequisite
        activeCoursesData.forEach(course => {
            if (selectedElectives.has(course.id) && course.prerequisites.includes(courseId)) {
                removeElectiveFromPlan(course.id);
            }
        });
    }

    function updatePlannerUI() {
        // 1. Sync visual states in the course tree
        activeCoursesData.forEach(course => {
            const card = document.getElementById(`node-${course.id}`);
            if (!card) return;

            const isSelected = selectedElectives.has(course.id);
            const selectBtn = card.querySelector('.node-select-btn');

            if (isSelected) {
                card.classList.add('selected-plan');
                if (selectBtn) {
                    selectBtn.innerText = '-';
                    selectBtn.title = 'Remove from Plan';
                }
            } else {
                card.classList.remove('selected-plan');
                if (selectBtn) {
                    selectBtn.innerText = '+';
                    selectBtn.title = 'Add to Plan';
                }
            }
        });

        // 2. Render Selected Electives list in the sidebar
        selectedList.innerHTML = '';
        if (selectedElectives.size === 0) {
            selectedList.innerHTML = '<p class="empty-selection-text">No elective courses selected. Click + on elective cards to add.</p>';
        } else {
            const sortedSelected = Array.from(selectedElectives).sort();
            sortedSelected.forEach(cid => {
                const course = courseMap.get(cid);
                if (!course) return;

                const item = document.createElement('div');
                item.className = `selected-item ${course.classification}`;
                item.innerHTML = `
                    <div class="selected-item-info">
                        <span class="selected-item-id">${course.id}</span>
                        <span class="selected-item-name">${course.name_EN}</span>
                    </div>
                    <button class="remove-item-btn" title="Remove from Plan">&times;</button>
                `;

                // Click on item selects and highlights in tree
                item.addEventListener('click', () => {
                    selectCourse(cid);
                    focusOnNode(cid);
                });

                // Remove button action
                const removeBtn = item.querySelector('.remove-item-btn');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleElective(cid);
                });

                selectedList.appendChild(item);
            });
        }

        // 3. Sync plan button inside course details pane
        if (selectedCourseId) {
            const detailActionBtn = document.getElementById('detail-action-btn');
            if (detailActionBtn) {
                const isSelected = selectedElectives.has(selectedCourseId);
                if (isSelected) {
                    detailActionBtn.className = "detail-plan-action-btn remove-from-plan";
                    detailActionBtn.innerHTML = "➖ Remove from Plan";
                } else {
                    detailActionBtn.className = "detail-plan-action-btn add-to-plan";
                    detailActionBtn.innerHTML = "➕ Add to Plan";
                }
            }
        }

        // 4. Update Requirement Progress Audit
        let totalCredits = 0;
        let tier4Credits = 0;
        let projectCredits = 0;

        selectedElectives.forEach(cid => {
            const course = courseMap.get(cid);
            if (!course) return;

            // Parse credits, e.g. "3(3-0-6)" -> 3
            const creditsVal = parseInt(course.credits.split('(')[0]) || 0;
            totalCredits += creditsVal;

            // Check tier 4: 4th character of ID is '4'
            const isTier4 = cid.substring(3, 4) === '4';
            if (isTier4) {
                tier4Credits += creditsVal;
            }

            // Check project elective: check if listed in new_curriculum_69 project electives
            const ver = versionFilter ? versionFilter.value : 'new';
            const path = pathFilter ? pathFilter.value : 'coop';
            const rule = curriculumRules[`new_${path}`];
            if (ver === 'new' && rule && rule.projectElectives.includes(cid)) {
                projectCredits += creditsVal;
            }
        });

        const verVal = versionFilter ? versionFilter.value : 'new';
        const pathVal = pathFilter ? pathFilter.value : 'coop';
        const minorVal = minorFilter ? minorFilter.value : 'non-cs';
        const auditKey = `${verVal}_${pathVal}_${minorVal}`;
        const auditLimit = auditRules[auditKey] || { total: 15, tier4: 9, project: 0 };

        // Update UI elements for Total credits
        const totalValEl = document.getElementById('audit-total-val');
        const totalFillEl = document.getElementById('audit-total-fill');
        if (totalValEl && totalFillEl) {
            totalValEl.innerText = `${totalCredits} / ${auditLimit.total} Credits`;
            const percent = Math.min(100, (totalCredits / auditLimit.total) * 100);
            totalFillEl.style.width = `${percent}%`;
            if (totalCredits >= auditLimit.total) {
                totalFillEl.classList.add('satisfied');
            } else {
                totalFillEl.classList.remove('satisfied');
            }
        }

        // Update UI elements for Tier 4
        const tier4ValEl = document.getElementById('audit-tier4-val');
        const tier4FillEl = document.getElementById('audit-tier4-fill');
        if (tier4ValEl && tier4FillEl) {
            tier4ValEl.innerText = `${tier4Credits} / ${auditLimit.tier4} Credits`;
            const percent = Math.min(100, (tier4Credits / auditLimit.tier4) * 100);
            tier4FillEl.style.width = `${percent}%`;
            if (tier4Credits >= auditLimit.tier4) {
                tier4FillEl.classList.add('satisfied');
            } else {
                tier4FillEl.classList.remove('satisfied');
            }
        }

        // Update UI elements for Projects
        const projectItemEl = document.getElementById('audit-project-credits');
        const projectValEl = document.getElementById('audit-project-val');
        const projectFillEl = document.getElementById('audit-project-fill');
        if (projectItemEl && projectValEl && projectFillEl) {
            if (auditLimit.project > 0) {
                projectItemEl.style.display = 'block';
                projectValEl.innerText = `${projectCredits} / ${auditLimit.project} Credits`;
                const percent = Math.min(100, (projectCredits / auditLimit.project) * 100);
                projectFillEl.style.width = `${percent}%`;
                if (projectCredits >= auditLimit.project) {
                    projectFillEl.classList.add('satisfied');
                } else {
                    projectFillEl.classList.remove('satisfied');
                }
            } else {
                projectItemEl.style.display = 'none';
            }
        }

        // Update Overall Status Message
        const statusMsgEl = document.getElementById('audit-status-msg');
        if (statusMsgEl) {
            const isTotalSatisfied = totalCredits >= auditLimit.total;
            const isTier4Satisfied = tier4Credits >= auditLimit.tier4;
            const isProjectSatisfied = auditLimit.project === 0 || projectCredits >= auditLimit.project;

            if (isTotalSatisfied && isTier4Satisfied && isProjectSatisfied) {
                statusMsgEl.className = "audit-status-msg satisfied";
                statusMsgEl.innerHTML = "✅ Plan satisfies all requirements!";
            } else {
                statusMsgEl.className = "audit-status-msg unsatisfied";
                statusMsgEl.innerHTML = "❌ Requirements not satisfied";
            }
        }
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

        // Add action button for electives
        const isRequired = course.classification === 'core' || course.classification === 'compulsory';
        let actionBtnHtml = '';
        if (!isRequired) {
            const isSelected = selectedElectives.has(courseId);
            actionBtnHtml = isSelected
                ? `<button class="detail-plan-action-btn remove-from-plan" id="detail-action-btn">➖ Remove from Plan</button>`
                : `<button class="detail-plan-action-btn add-to-plan" id="detail-action-btn">➕ Add to Plan</button>`;
        }

        drawerHeader.innerHTML = `
            <span class="course-type-tag ${course.classification}">${classLabel}</span>
            <h2>${course.id}</h2>
            <div class="credits-text">${course.name_TH}</div>
            <div class="credits-text" style="font-size:0.95rem; opacity:0.8; font-style:italic;">${course.name_EN}</div>
            <div class="credits-text" style="margin-top:0.4rem; font-weight:600; color:var(--text-primary); font-size:0.8rem;">
                Credits: ${course.credits}
            </div>
            ${actionBtnHtml}
        `;

        // Attach details pane button event listener
        const detailActionBtn = document.getElementById('detail-action-btn');
        if (detailActionBtn) {
            detailActionBtn.addEventListener('click', () => {
                toggleElective(courseId);
            });
        }

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

        // Render Prerequisite string from MIS source with interactive badges
        const rawText = misPrereqs[courseId] || "None";
        if (rawText && rawText !== "None" && rawText !== "None (ไม่มี)") {
            const formattedHtml = rawText.replace(/\b\d{6}\b/g, (code) => {
                const hasCourse = courseMap.has(code);
                return `<span class="prereq-badge ${hasCourse ? 'in-dept' : 'external'}" data-id="${code}">${code}</span>`;
            });
            detailsPrereqText.innerHTML = formattedHtml;
            
            // Attach event listeners to active in-dept badges
            detailsPrereqText.querySelectorAll('.prereq-badge.in-dept').forEach(badge => {
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const pid = badge.dataset.id;
                    selectCourse(pid);
                    focusOnNode(pid);
                });
            });
        } else {
            detailsPrereqText.innerHTML = '<p class="dep-empty">None (ไม่มี)</p>';
        }

        // Render Postrequisites
        drawerPostreqs.innerHTML = '';
        if (course.postrequisites.length > 0) {
            const uniquePostreqs = Array.from(new Set(course.postrequisites)).sort();
            uniquePostreqs.forEach(pid => {
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

        // Show details, hide placeholder
        detailsPlaceholder.classList.add('hidden');
        detailsContainer.classList.remove('hidden');
    }

    function closeDrawer() {
        detailsContainer.classList.add('hidden');
        detailsPlaceholder.classList.remove('hidden');
    }

    // Focuses and centers layout viewport on a node card using native scrolling
    function focusOnNode(courseId) {
        const node = document.getElementById(`node-${courseId}`);
        if (!node) return;

        const viewportRect = viewport.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        
        // Calculate scroll offsets
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

    function handleCurriculumChange() {
        updateActiveData();
        // Filter out any selected electives that are no longer allowed in this combination
        const allowedIds = new Set(activeCoursesData.map(c => c.id));
        for (const cid of selectedElectives) {
            if (!allowedIds.has(cid)) {
                selectedElectives.delete(cid);
            }
        }
        initGrid();
        clearSelection();
        updatePlannerUI();
        drawConnections();
    }

    if (versionFilter) versionFilter.addEventListener('change', handleCurriculumChange);
    if (pathFilter) pathFilter.addEventListener('change', handleCurriculumChange);
    if (minorFilter) minorFilter.addEventListener('change', handleCurriculumChange);

    resetFiltersBtn.addEventListener('click', () => {
        if (versionFilter) versionFilter.value = 'new';
        if (pathFilter) pathFilter.value = 'coop';
        if (minorFilter) minorFilter.value = 'non-cs';
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.course-node').forEach(node => {
            node.classList.remove('hidden', 'search-match', 'search-no-match', 'dimmed');
        });
        
        selectedElectives.clear();
        handleCurriculumChange();
    });

    clearSelectionBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.course-node').forEach(node => {
            node.classList.remove('hidden', 'search-match', 'search-no-match', 'dimmed');
        });
        
        clearSelection();
        drawConnections();
    });

    // Click legend bar filter shortcuts
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            // Highlight nodes of this classification, dim others
            document.querySelectorAll('.course-node').forEach(node => {
                const courseId = node.dataset.id;
                const course = courseMap.get(courseId);
                if (course && (course.classification === type || 
                    (type === 'project-elective' && course.classification === 'project-elective') || 
                    (type === 'non-project-elective' && course.classification === 'non-project-elective'))) {
                    node.classList.remove('dimmed');
                    node.classList.add('search-match');
                } else {
                    node.classList.add('dimmed');
                    node.classList.remove('search-match');
                }
            });
            clearSelectionBtn.classList.remove('hidden');
        });
    });

    // ----------------------------------------------------
    // 7. Clipboard Selection Sharing & URL Parameter Loader
    // ----------------------------------------------------
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const ver = versionFilter ? versionFilter.value : 'new';
            const path = pathFilter ? pathFilter.value : 'coop';
            const minor = minorFilter ? minorFilter.value : 'non-cs';
            const selectedArr = Array.from(selectedElectives);
            
            // Build URL
            const urlObj = new URL(window.location.href);
            urlObj.searchParams.set('ver', ver);
            urlObj.searchParams.set('path', path);
            urlObj.searchParams.set('minor', minor);
            if (selectedArr.length > 0) {
                urlObj.searchParams.set('selected', selectedArr.join(','));
            } else {
                urlObj.searchParams.delete('selected');
            }
            
            const shareUrl = urlObj.toString();
            
            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast("📋 Plan link copied to clipboard!");
            }).catch(err => {
                console.error("Could not copy link:", err);
                showToast("Could not copy automatically. Link generated in URL address bar.");
            });
        });
    }

    function showToast(message) {
        toastContainer.innerHTML = '';
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>💡</span> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        toastContainer.classList.add('show');
        
        setTimeout(() => {
            toastContainer.classList.remove('show');
        }, 3000);
    }

    function loadSelectionFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        let changed = false;
        const verParam = urlParams.get('ver');
        if (verParam && versionFilter) {
            versionFilter.value = verParam;
            changed = true;
        }
        const pathParam = urlParams.get('path');
        if (pathParam && pathFilter) {
            pathFilter.value = pathParam;
            changed = true;
        }
        const minorParam = urlParams.get('minor');
        if (minorParam && minorFilter) {
            minorFilter.value = minorParam;
            changed = true;
        }
        
        if (changed) {
            updateActiveData();
            initGrid();
        }
        
        // Load selected electives
        const selectedParam = urlParams.get('selected');
        if (selectedParam) {
            selectedElectives.clear();
            const ids = selectedParam.split(',');
            ids.forEach(id => {
                const cleanId = id.trim();
                if (cleanId) {
                    addElectiveToPlan(cleanId);
                }
            });
            updatePlannerUI();
        }
        
        // Always draw connections after loading selections
        drawConnections();
    }
});
