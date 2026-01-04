let peer = null;
let containerId = null;
let localStream = null;
let screenStream = null;
const peers = {}; // { [id]: { mainCall, screenCall } }
const dataConnections = {}; // { [id]: DataConnection }

// User State
const ANIME_NAMES = [
    'Naruto', 'Sasuke', 'Goku', 'Vegeta', 'Luffy', 'Zoro', 'Ichigo', 'Rukia',
    'Levi', 'Mikasa', 'Eren', 'Light', 'L', 'Tanjiro', 'Nezuko', 'Gojo',
    'Itachi', 'Kakashi', 'Hinata', 'Sakura', 'Killua', 'Gon', 'Saitama',
    'Mob', 'Deku', 'Bakugo', 'Todoroki', 'All Might', 'Shinji', 'Asuka',
    'Rei', 'Spike', 'Faye', 'Edward', 'Alphonse', 'Roy', 'Lelouch', 'Zero',
    'Natsu', 'Erza', 'Gray', 'Lucy', 'Rimuru', 'Ainz', 'Kirito', 'Asuna',
    'Sinon', 'Rem', 'Emilia', 'Subaru', 'Kazuma', 'Megumin', 'Aqua'
];

function getRandomAnimeName() {
    return ANIME_NAMES[Math.floor(Math.random() * ANIME_NAMES.length)];
}

function getRandomAnimeAvatar(seed) {
    // Using lorelei style for anime-like avatars
    const styles = ['lorelei', 'bottts', 'fun-emoji', 'adventurer'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed || Math.random().toString(36).substring(7)}`;
}

let myName = getRandomAnimeName();
let myAvatar = getRandomAnimeAvatar(myName);
let pendingJoinCode = null;
let isScreenSharing = false;
let amIHost = false;

// Permission State - Track video and audio separately
let usingDummyVideo = false;
let usingDummyAudio = false;
let permissionRetryDone = false;

// Phase 1: New State Variables
let meetingStartTime = null;
let myHandRaised = false;
const participantsData = {}; // { [peerId]: { name, avatar, handRaised, isMuted } }
const pendingStreams = {}; // { [peerId]: { main: stream, screen: stream } }
let audioContext = null;
let audioAnalyzers = {}; // { [peerId]: { analyser, dataArray } }

// Meeting Type & Waiting Room State
let meetingType = 'public'; // 'public' or 'private'
const pendingRequests = {}; // { [peerId]: { name, avatar, conn, timestamp } }
let waitingForApproval = false;
let hostPeerId = null;

// Audio
const audioJoin = document.getElementById('audio-join');
const audioMessage = document.getElementById('audio-message');
const audioLeave = document.getElementById('audio-leave');
const audioRequest = document.getElementById('audio-request');

// DOM Sections
const landingView = document.getElementById('landing-view');
const lobbyView = document.getElementById('lobby-view');
const meetingView = document.getElementById('meeting-view');

// Landing Elements
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const meetingCodeInput = document.getElementById('meeting-code-input');

// Lobby Elements
const avatarPreview = document.getElementById('avatar-preview');
const randomAvatarBtn = document.getElementById('random-avatar-btn');
const uploadAvatar = document.getElementById('upload-avatar');
const usernameInput = document.getElementById('username-input');
const enterMeetingBtn = document.getElementById('enter-meeting-btn');
const backToHomeBtn = document.getElementById('back-to-home-btn');
const lobbyStatus = document.getElementById('lobby-status');

// Meeting Elements
const meetingIdDisplay = document.getElementById('meeting-id-display');
const videoGrid = document.getElementById('video-grid');
const copyBtn = document.getElementById('copy-btn');
const toast = document.getElementById('toast');
const clock = document.getElementById('clock');
const videoToggleBtn = document.getElementById('video-toggle');
const audioToggleBtn = document.getElementById('audio-toggle');
const screenShareBtn = document.getElementById('screen-share-btn');
const leaveBtn = document.getElementById('leave-btn');

// Chat Elements
const chatSidebar = document.getElementById('chat-sidebar');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const closeChatBtn = document.getElementById('close-chat');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const chatBadge = document.getElementById('chat-badge');

// Phase 1: New DOM Elements
const timerDisplay = document.getElementById('timer-display');
const participantCount = document.getElementById('participant-count');
const sidebarParticipantCount = document.getElementById('sidebar-participant-count');
const participantsToggle = document.getElementById('participants-toggle');
const participantsSidebar = document.getElementById('participants-sidebar');
const closeParticipantsBtn = document.getElementById('close-participants');
const participantsList = document.getElementById('participants-list');
const handRaiseBtn = document.getElementById('hand-raise-btn');
const reactionsContainer = document.getElementById('reactions-container');
const reactionBtns = document.querySelectorAll('.reaction-btn');
const muteAllBtn = document.getElementById('mute-all-btn');

// Loading Overlay Elements
const meetingLoading = document.getElementById('meeting-loading');
const loadingStatus = document.getElementById('loading-status');
let isConnectionReady = false;

// Meeting Type & Waiting Room Elements
const meetingTypeSection = document.getElementById('meeting-type-section');
const typePublicBtn = document.getElementById('type-public');
const typePrivateBtn = document.getElementById('type-private');
const waitingRoomView = document.getElementById('waiting-room-view');
const waitingStatus = document.getElementById('waiting-status');
const waitingAvatar = document.getElementById('waiting-avatar');
const waitingName = document.getElementById('waiting-name');
const cancelJoinBtn = document.getElementById('cancel-join-btn');
const joinRequestsPanel = document.getElementById('join-requests-panel');
const requestsList = document.getElementById('requests-list');
const requestCount = document.getElementById('request-count');

// Phase 2: New DOM Elements
const chatRecipient = document.getElementById('chat-recipient');
const pollTrigger = document.getElementById('poll-trigger');
const fileTrigger = document.getElementById('file-trigger');
const fileInput = document.getElementById('file-input');
const gifTrigger = null; // Removed
const gifModal = null; // Removed
const closeGifModal = null; // Removed
const gifItems = []; // Removed
const pinnedPollOverlay = document.getElementById('pinned-poll-overlay');
const pinnedPollQuestion = document.getElementById('pinned-poll-question');
const pinnedPollOptions = document.getElementById('pinned-poll-options');
const pinnedPollStatus = document.getElementById('pinned-poll-status');
const viewPollBtn = document.getElementById('view-poll-btn');
const deletePollBtnPinned = document.getElementById('delete-poll-btn-pinned');
const deletePollBtnModal = document.getElementById('delete-poll-btn-modal');

// DOM Elements - Phase 3
const passwordWrapper = document.getElementById('password-wrapper');
const meetingPasswordInput = document.getElementById('meeting-password-input');
const meetingLockBtn = document.getElementById('meeting-lock-btn');
const recordToggle = document.getElementById('record-toggle');
const recordBadge = recordToggle?.querySelector('.record-badge');
const passwordModal = document.getElementById('password-modal');
const joinPasswordInput = document.getElementById('join-password-input');
const submitPasswordBtn = document.getElementById('submit-password-btn');
const cancelPasswordBtn = document.getElementById('cancel-password-btn');

// DOM Elements - Phase 3 Part 2
const whiteboardToggle = document.getElementById('whiteboard-toggle');
const whiteboardOverlay = document.getElementById('whiteboard-overlay');
const whiteboardCanvas = document.getElementById('whiteboard-canvas');
const clearWhiteboardBtn = document.getElementById('clear-whiteboard');
const closeWhiteboardBtn = document.getElementById('close-whiteboard');
const captionsBtn = document.getElementById('captions-btn');
const captionsContainer = document.getElementById('captions-container');
const captionsText = document.getElementById('captions-text');

// DOM Elements - Phase 5
const moreToggle = document.getElementById('more-toggle');
const moreOptionsPanel = document.getElementById('more-options-panel');
const permissionModal = document.getElementById('permission-modal');
const permissionTitle = document.getElementById('permission-title');
const permissionMessage = document.getElementById('permission-message');
const approvePermissionBtn = document.getElementById('approve-permission-btn');
const denyPermissionBtn = document.getElementById('deny-permission-btn');

const emojiTrigger = document.getElementById('emoji-trigger');
const emojiPicker = document.getElementById('emoji-picker');
const pollModal = document.getElementById('poll-modal');
const closePollModal = document.getElementById('close-poll-modal');
const pollCreateView = document.getElementById('poll-create-view');
const pollActiveView = document.getElementById('poll-active-view');
const pollQuestionInput = document.getElementById('poll-question');
const pollOptionsContainer = document.getElementById('poll-options-container');
const addOptionBtn = document.getElementById('add-option-btn');
const createPollBtn = document.getElementById('create-poll-btn');
const activePollQuestion = document.getElementById('active-poll-question');
const activePollOptions = document.getElementById('active-poll-options');
const pollVoteCount = document.getElementById('poll-vote-count');
const mirrorBtn = document.getElementById('mirror-btn');
const pipBtn = document.getElementById('pip-btn');

// Phase 2 State
let isMirrored = false;
let activePoll = null; // { question, options: [{text, votes: []}], creator: id }
let hasVoted = false;

// Phase 3 State
let isMeetingLocked = false;
let meetingPassword = '';
let amICoHost = false;
let bannedPeers = [];
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

let isWhiteboardOpen = false;
let isDrawing = false;
let lastDrawCoords = { x: 0, y: 0 };
let whiteboardColor = '#000000';
let isCaptionsEnabled = false;
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Phase 5 State
let hasWhiteboardPermission = false;
let hasScreenSharePermission = false;
let pendingPermissionRequest = null; // { peerId, type }

// -- INITIALIZATION --
function init() {
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(updateConnectionQuality, 5000); // Check quality every 5s

    const urlParams = new URLSearchParams(window.location.search);
    pendingJoinCode = urlParams.get('join');

    if (pendingJoinCode) {
        landingView.classList.remove('active');
        showLobby();
        meetingCodeInput.value = pendingJoinCode;
    }
}

window.addEventListener('beforeunload', () => {
    if (peer) peer.destroy();
});

// -- LANDING EVENTS --
createBtn.addEventListener('click', () => {
    pendingJoinCode = null;
    showLobby();
});

joinBtn.addEventListener('click', () => {
    const code = meetingCodeInput.value.trim();
    if (!code) return;
    pendingJoinCode = code;
    showLobby();
});

meetingCodeInput.addEventListener('input', () => {
    joinBtn.disabled = meetingCodeInput.value.trim().length === 0;
});

// -- LOBBY LOGIC --
function showLobby() {
    landingView.classList.remove('active');
    lobbyView.classList.add('active');

    // Show random anime name and avatar already generated
    usernameInput.value = myName;
    usernameInput.placeholder = myName;
    avatarPreview.src = myAvatar;

    // Show meeting type selection only for host (creating new meeting)
    if (!pendingJoinCode && meetingTypeSection) {
        meetingTypeSection.classList.remove('hidden');
    } else if (meetingTypeSection) {
        meetingTypeSection.classList.add('hidden');
    }

    lobbyStatus.innerText = "Requesting Camera & Mic access...";
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            usingDummyVideo = false;
            usingDummyAudio = false;
            lobbyStatus.innerText = "Ready to join!";
            lobbyStatus.style.color = "#4ade80";
            audioToggleBtn.classList.remove('active');
            videoToggleBtn.classList.remove('active');
        })
        .catch(err => {
            console.warn("Permission denied, using dummy stream", err);
            localStream = createDummyStream();
            usingDummyVideo = true;
            usingDummyAudio = true;
            lobbyStatus.innerText = "Permissions denied. Join with Mic/Cam OFF.";
            lobbyStatus.style.color = "#fbbc04";
            audioToggleBtn.classList.add('active');
            videoToggleBtn.classList.add('active');
        });
}

// Meeting type toggle event listeners
if (typePrivateBtn) {
    typePrivateBtn.addEventListener('click', () => {
        meetingType = 'private';
        typePrivateBtn.classList.add('active');
        typePublicBtn.classList.remove('active');
        if (passwordWrapper) passwordWrapper.classList.remove('hidden');
    });
}

if (typePublicBtn) {
    typePublicBtn.addEventListener('click', () => {
        meetingType = 'public';
        typePublicBtn.classList.add('active');
        typePrivateBtn.classList.remove('active');
        if (passwordWrapper) passwordWrapper.classList.add('hidden');
    });
}

function createDummyStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 640, 480);
    const videoStream = canvas.captureStream(30);
    const videoTrack = videoStream.getVideoTracks()[0];
    videoTrack.enabled = false;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const oscillator = audioCtx.createOscillator();
    oscillator.connect(dest);
    const audioTrack = dest.stream.getAudioTracks()[0];
    audioTrack.enabled = false;

    return new MediaStream([videoTrack, audioTrack]);
}

randomAvatarBtn.addEventListener('click', () => {
    const seed = Math.random().toString(36).substring(7);
    myAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    avatarPreview.src = myAvatar;
});

uploadAvatar.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            myAvatar = e.target.result;
            avatarPreview.src = myAvatar;
        };
        reader.readAsDataURL(file);
    }
});

backToHomeBtn.addEventListener('click', () => {
    lobbyView.classList.remove('active');
    landingView.classList.add('active');
});

enterMeetingBtn.addEventListener('click', () => {
    myName = usernameInput.value.trim() || 'Guest';
    lobbyView.classList.remove('active');
    startMeeting(pendingJoinCode);
});


// -- MEETING CORE --
async function startMeeting(joinId) {
    amIHost = !joinId;
    if (!localStream) localStream = createDummyStream();

    meetingView.classList.add('active');

    // Show loading overlay
    if (meetingLoading) meetingLoading.classList.remove('hidden');
    updateLoadingStatus('Setting up your connection...');

    addVideoStream(localStream, true, myName, myAvatar, true, null, false);

    if (usingDummyVideo || usingDummyAudio) {
        const localWrapper = document.getElementById('wrapper-local');
        if (localWrapper) {
            if (usingDummyVideo) localWrapper.classList.add('video-off');
            const micStat = localWrapper.querySelector('.mic-status');
            if (micStat && usingDummyAudio) {
                micStat.classList.add('muted');
                micStat.querySelector('i').className = 'fas fa-microphone-slash';
            }
        }
        if (usingDummyAudio) audioToggleBtn.classList.add('active');
        if (usingDummyVideo) videoToggleBtn.classList.add('active');
        localStream.getTracks().forEach(t => t.enabled = false);
    }

    updateLoadingStatus('Connecting to server...');
    peer = new Peer({ debug: 2 });

    peer.on('open', (id) => {
        containerId = id;
        console.log("My Peer ID:", id);

        if (joinId) {
            updateLoadingStatus('Checking meeting...');
            hostPeerId = joinId;
            // First, send a join request to check if meeting is private
            requestToJoinMeeting(joinId);
            meetingIdDisplay.innerText = `Connected: ${joinId.slice(0, 8)}...`;
        } else {
            // Host: Ready immediately, hide loading
            meetingIdDisplay.innerText = `Code: ${id}`;
            addSystemMessage(meetingType === 'private' ?
                "Private meeting. You control who joins." :
                "Waiting for others...");
            hideLoadingOverlay();
            updateHostUI();
            // Initialize Phase 1 features for host
            initPhase1Features();
            playSound(audioJoin);

            // Phase 3: Set initial password and sync lock state
            if (meetingPasswordInput) meetingPassword = meetingPasswordInput.value.trim();
        }
    });

    peer.on('call', handleIncomingCall);
    peer.on('connection', handleDataConnection);
    peer.on('error', handlePeerError);

    if (usingDummyVideo || usingDummyAudio) {
        setTimeout(() => {
            if ((usingDummyVideo || usingDummyAudio) && !permissionRetryDone) {
                showToast("Requesting Camera/Mic Access...");
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .then(upgradeToRealStream)
                    .catch(() => { permissionRetryDone = true; });
            }
        }, 20000);
    }
}

function upgradeToRealStream(newStream) {
    const oldTracks = localStream.getTracks();
    const newTracks = newStream.getTracks();

    const localWrapper = document.getElementById('wrapper-local');
    if (localWrapper) {
        localWrapper.querySelector('video').srcObject = newStream;
        localWrapper.classList.remove('video-off');
    }

    for (let peerId in peers) {
        const call = peers[peerId].mainCall;
        if (call && call.peerConnection) {
            call.peerConnection.getSenders().forEach(sender => {
                const track = newTracks.find(t => t.kind === sender.track.kind);
                if (track) sender.replaceTrack(track);
            });
        }
    }

    oldTracks.forEach(t => t.stop());
    localStream = newStream;
    usingDummyVideo = false;
    usingDummyAudio = false;

    audioToggleBtn.classList.remove('active');
    videoToggleBtn.classList.remove('active');
    broadcastData({ type: 'video-state', enabled: true, fromPeer: containerId });
    broadcastData({ type: 'audio-state', enabled: true, fromPeer: containerId });
    showToast("Mic & Camera Enabled!");
}

async function upgradeAudioOnly() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newAudioTrack = stream.getAudioTracks()[0];
        const oldAudioTrack = localStream.getAudioTracks()[0];
        if (oldAudioTrack) { localStream.removeTrack(oldAudioTrack); oldAudioTrack.stop(); }
        localStream.addTrack(newAudioTrack);

        for (let peerId in peers) {
            const call = peers[peerId].mainCall;
            if (call && call.peerConnection) {
                const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'audio');
                if (sender) sender.replaceTrack(newAudioTrack);
            }
        }
        audioToggleBtn.classList.remove('active');
        usingDummyAudio = false;  // Only audio is now real, video may still be dummy
        broadcastData({ type: 'audio-state', enabled: true, fromPeer: containerId });
        const wrapper = document.getElementById('wrapper-local');
        if (wrapper) {
            const micStat = wrapper.querySelector('.mic-status');
            if (micStat) { micStat.classList.remove('muted'); micStat.querySelector('i').className = 'fas fa-microphone'; }
        }
        showToast("Microphone Enabled!");
    } catch (err) { showToast("Mic Access Denied"); }
}


// ======================================================================
// CORE CONNECTION LOGIC
// ======================================================================

function handleIncomingCall(call) {
    const isScreenCall = call.metadata && call.metadata.type === 'screen';
    console.log(`Incoming ${isScreenCall ? 'screen' : 'main'} call from:`, call.peer);

    if (isScreenCall) call.answer();
    else call.answer(localStream);

    call.on('stream', (remoteStream) => {
        if (isScreenCall) {
            addVideoStream(remoteStream, false, "Screen", null, false, call.peer, true);
        } else {
            if (!pendingStreams[call.peer]) pendingStreams[call.peer] = {};
            pendingStreams[call.peer].main = remoteStream;
            if (participantsData[call.peer]) {
                const data = participantsData[call.peer];
                addVideoStream(remoteStream, false, data.name, data.avatar, false, call.peer, false);
                updateAudioState(call.peer, !data.isMuted);
                delete pendingStreams[call.peer].main;
            }
        }
    });

    call.on('close', () => {
        const id = isScreenCall ? `wrapper-screen-${call.peer}` : `wrapper-${call.peer}`;
        document.getElementById(id)?.remove();
    });

    if (!peers[call.peer]) peers[call.peer] = {};
    if (isScreenCall) peers[call.peer].screenCall = call;
    else peers[call.peer].mainCall = call;

    // *** CRITICAL FIX: Establish data connection BACK to caller ***
    // This enables bidirectional identity/state exchange for mesh connections
    if (!isScreenCall) {
        if (!dataConnections[call.peer] || !dataConnections[call.peer].open) {
            console.log("Establishing data connection back to:", call.peer);
            const conn = peer.connect(call.peer);
            handleDataConnection(conn);
        } else {
            console.log("Data connection already exists for:", call.peer);
            // Even if it exists, trigger identity exchange to be sure
            handleDataConnection(dataConnections[call.peer]);
        }
    }
}

function connectToPeer(peerId) {
    if (peers[peerId] || peerId === containerId) return;
    console.log("Connecting to peer:", peerId);

    const call = peer.call(peerId, localStream, { metadata: { type: 'main' } });
    call.on('stream', (remoteStream) => {
        if (!pendingStreams[peerId]) pendingStreams[peerId] = {};
        pendingStreams[peerId].main = remoteStream;

        if (participantsData[peerId]) {
            const data = participantsData[peerId];
            addVideoStream(remoteStream, false, data.name, data.avatar, false, peerId, false);
            updateAudioState(peerId, !data.isMuted);
            delete pendingStreams[peerId].main;
        }
    });
    call.on('close', () => closePeer(peerId));

    if (!peers[peerId]) peers[peerId] = {};
    peers[peerId].mainCall = call;

    if (!dataConnections[peerId] || !dataConnections[peerId].open) {
        const conn = peer.connect(peerId);
        handleDataConnection(conn);
    } else {
        handleDataConnection(dataConnections[peerId]);
    }
    if (isScreenSharing && screenStream) {
        const sCall = peer.call(peerId, screenStream, { metadata: { type: 'screen' } });
        peers[peerId].screenCall = sCall;
    }
}

function closePeer(peerId) {
    console.log("Closing peer:", peerId);
    document.getElementById(`wrapper-${peerId}`)?.remove();
    document.getElementById(`wrapper-screen-${peerId}`)?.remove();
    if (dataConnections[peerId]) { try { dataConnections[peerId].close(); } catch (e) { } }
    delete peers[peerId];
    delete dataConnections[peerId];
    // Phase 1: Clean up participant data
    delete participantsData[peerId];
    delete audioAnalyzers[peerId];
    renderParticipantsList();
    playSound(audioLeave);
}

function handleDataConnection(conn) {
    if (dataConnections[conn.peer] && dataConnections[conn.peer].open) {
        // Already have an open connection, skip
        console.log("Already have data connection to:", conn.peer);
        return;
    }
    dataConnections[conn.peer] = conn;
    console.log("Setting up data connection with:", conn.peer);

    const onOpen = () => {
        console.log("Data connection opened with:", conn.peer);

        let vEnabled = false;
        let aEnabled = false;
        if (localStream) {
            const vTrack = localStream.getVideoTracks()[0];
            const aTrack = localStream.getAudioTracks()[0];
            vEnabled = !usingDummyVideo && vTrack && vTrack.enabled;
            aEnabled = !usingDummyAudio && aTrack && aTrack.enabled;
        }

        // Send Identity with states
        conn.send({
            type: 'identity',
            name: myName,
            avatar: myAvatar,
            audioEnabled: aEnabled,
            videoEnabled: vEnabled
        });

        // MESH: Host sends list of other peers
        if (amIHost) {
            const otherPeers = Object.keys(peers).filter(id => id !== conn.peer);
            if (otherPeers.length > 0) {
                console.log("Sending peer-list to", conn.peer, ":", otherPeers);
                conn.send({ type: 'peer-list', peers: otherPeers });
            }
        }

        // Also send states as separate messages for redundancy/update logic
        conn.send({ type: 'video-state', enabled: vEnabled, fromPeer: containerId });
        conn.send({ type: 'audio-state', enabled: aEnabled, fromPeer: containerId });

        // Phase 2 Refinement: Send active poll if it exists
        if (amIHost && activePoll) {
            conn.send({ type: 'poll-create', poll: activePoll });
        }
    };

    if (conn.open) onOpen();
    else conn.on('open', onOpen);

    conn.on('data', (data) => {
        if (data.type === 'peer-list') {
            console.log("Received peer-list:", data.peers);
            data.peers.forEach(pid => connectToPeer(pid));
        }
        else if (data.type === 'identity') {
            console.log("Received identity from", conn.peer, ":", data.name, "audioOn:", data.audioEnabled, "videoOn:", data.videoEnabled);
            // Store participant data for Phase 1 features (with initial state)
            participantsData[conn.peer] = {
                name: data.name,
                avatar: data.avatar,
                handRaised: false,
                isMuted: data.audioEnabled === false  // If audio not enabled, they're muted
            };

            // CHECK: Do we have a pending stream for this user?
            if (pendingStreams[conn.peer] && pendingStreams[conn.peer].main) {
                console.log("Found pending stream for", conn.peer, "- adding now");
                addVideoStream(pendingStreams[conn.peer].main, false, data.name, data.avatar, false, conn.peer, false);
                delete pendingStreams[conn.peer].main;
            }

            updatePeerUI(conn.peer, data.name, data.avatar);
            // Also update video/audio state if provided
            if (data.videoEnabled !== undefined) updateVideoState(conn.peer, data.videoEnabled);
            if (data.audioEnabled !== undefined) updateAudioState(conn.peer, data.audioEnabled);
            renderParticipantsList();
            // Hide loading overlay once we have identity (connection complete)
            hideLoadingOverlay();
        }
        else if (data.type === 'video-state') {
            updateVideoState(data.fromPeer, data.enabled);
        }
        else if (data.type === 'audio-state') {
            updateAudioState(data.fromPeer, data.enabled);
            if (participantsData[data.fromPeer]) {
                participantsData[data.fromPeer].isMuted = !data.enabled;
                renderParticipantsList();
            }
        }
        else if (data.type === 'chat' || data.type === 'private-chat') {
            handleChatMessage(data);
        }
        else if (data.type === 'file') handleFileReceive(data);
        else if (data.type === 'poll-create') handlePollReceive(data.poll);
        else if (data.type === 'poll-vote') handlePollVote(data);
        else if (data.type === 'poll-delete') handlePollDelete();
        else if (data.type === 'admin-action') {
            handleAdminAction(data.action);
        }
        else if (data.type === 'identity-update') {
            const targetPeerId = data.fromPeer;
            if (participantsData[targetPeerId]) {
                participantsData[targetPeerId] = { ...participantsData[targetPeerId], ...data.update };
            }
            // If the update is for the current user, set local state
            if (targetPeerId === containerId && data.update.isCoHost !== undefined) {
                amICoHost = data.update.isCoHost;
                updateHostUI();
                showToast(amICoHost ? 'You are now a Co-host!' : 'Your Co-host status was removed.');
            }
            renderParticipantsList();
        }
        else if (data.type === 'kick') {
            showToast('You have been removed from the meeting');
            setTimeout(() => window.location.reload(), 2000);
        }
        else if (data.type === 'meeting-state') {
            isMeetingLocked = data.locked;
            updateHostUI();
            updateMeetingBadge();
        }
        else if (data.type === 'password-required') {
            hideLoadingOverlay();
            if (passwordModal) passwordModal.classList.add('active');
        }
        else if (data.type === 'whiteboard-draw') {
            handleRemoteDraw(data);
        }
        else if (data.type === 'whiteboard-clear') {
            clearLocalCanvas();
        }
        else if (data.type === 'caption') {
            handleRemoteCaption(data);
        }
        else if (data.type === 'whiteboard-force-open') {
            isWhiteboardOpen = true;
            whiteboardOverlay.classList.remove('hidden');
            resizeCanvas();
            showToast('Host opened Whiteboard');
        }
        else if (data.type === 'whiteboard-force-close') {
            isWhiteboardOpen = false;
            whiteboardOverlay.classList.add('hidden');
            showToast('Host closed Whiteboard');
        }
        else if (data.type === 'permission-request') {
            if (amIHost || amICoHost) {
                handlePermissionRequest(data);
            }
        }
        else if (data.type === 'permission-response') {
            if (data.approved) {
                if (data.requestType === 'whiteboard') {
                    hasWhiteboardPermission = true;
                    isWhiteboardOpen = true;
                    whiteboardOverlay.classList.remove('hidden');
                    resizeCanvas();
                    showToast('Whiteboard Permission Granted!');
                    addSystemMessage('System: You have been granted Whiteboard permission.');
                }
                if (data.requestType === 'screen-share') {
                    hasScreenSharePermission = true;
                    showToast('Screen Share Permission Granted!');
                    addSystemMessage('System: You have been granted Screen Share permission. Click the icon to start.');
                }
            } else {
                showToast(`Permission Denied: ${data.requestType}`);
            }
        }
        else if (data.type === 'reaction') {
            handleReaction(data);
        }
        else if (data.type === 'join-request') {
            if (isMeetingLocked) {
                conn.send({ type: 'join-denied', reason: 'Meeting is locked' });
                return;
            }

            // Check password if set
            if (meetingPassword && data.password !== meetingPassword) {
                conn.send({ type: 'password-required' });
                return;
            }

            if (amIHost && meetingType === 'private') {
                handleJoinRequest(conn, data);
            } else if (amIHost && meetingType === 'public') {
                conn.send({ type: 'meeting-info', meetingType: 'public' });
            }
        }
        else if (data.type === 'join-approved') {
            handleJoinApproved();
            hostPeerId = conn.peer;
        } else if (data.type === 'join-denied') {
            handleJoinDenied();
        } else if (data.type === 'meeting-info') {
            if (data.meetingType === 'public') {
                actuallyJoinMeeting();
            } else if (data.meetingType === 'private' && !waitingForApproval) {
                if (meetingLoading) meetingLoading.classList.add('hidden');
                showWaitingRoom();
            }
        }
    });

    conn.on('close', () => closePeer(conn.peer));
    conn.on('error', (err) => { console.error("Data conn error:", err); closePeer(conn.peer); });
}

function updatePeerUI(peerId, name, avatar, retries = 15) {
    const wrapper = document.getElementById(`wrapper-${peerId}`);
    if (wrapper) {
        const nameTag = wrapper.querySelector('.name-tag');
        if (nameTag) nameTag.innerText = name;
        const avatarEl = wrapper.querySelector('.video-avatar');
        if (avatarEl && avatar) avatarEl.src = avatar;
        console.log(`Updated UI for ${peerId}: ${name}`);
    } else if (retries > 0) {
        // Retry faster with shorter interval
        setTimeout(() => updatePeerUI(peerId, name, avatar, retries - 1), 100);
    }
    // Also update screen wrapper name if exists
    const screenWrapper = document.getElementById(`wrapper-screen-${peerId}`);
    if (screenWrapper) {
        const nameTag = screenWrapper.querySelector('.name-tag');
        if (nameTag) nameTag.innerText = `${name}'s Screen`;
    }
}

function updateVideoState(peerId, enabled, retries = 10) {
    const wrapper = document.getElementById(`wrapper-${peerId}`);
    if (wrapper) {
        wrapper.classList.toggle('video-off', !enabled);
        console.log(`Video state for ${peerId}: ${enabled ? 'ON' : 'OFF'}`);
    } else if (retries > 0) {
        setTimeout(() => updateVideoState(peerId, enabled, retries - 1), 100);
    }
}

function updateAudioState(peerId, enabled, retries = 10) {
    const wrapper = document.getElementById(`wrapper-${peerId}`);
    if (wrapper) {
        const mic = wrapper.querySelector('.mic-status');
        if (mic) {
            mic.classList.toggle('muted', !enabled);
            mic.querySelector('i').className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        }
        console.log(`Audio state for ${peerId}: ${enabled ? 'ON' : 'OFF'}`);
    } else if (retries > 0) {
        setTimeout(() => updateAudioState(peerId, enabled, retries - 1), 100);
    }
}

// ======================================================================
// UI RENDERING
// ======================================================================

function addVideoStream(stream, isMuted, name, avatar, isLocal, peerId, isScreenBox) {
    const existingId = isLocal
        ? (isScreenBox ? 'wrapper-local-screen' : 'wrapper-local')
        : (isScreenBox ? `wrapper-screen-${peerId}` : `wrapper-${peerId}`);

    if (document.getElementById(existingId)) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.id = existingId;
    if (isLocal && !isScreenBox) wrapper.classList.add('local-user');
    if (isScreenBox) wrapper.classList.add('screen-wrapper');

    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = isMuted;
    video.autoplay = true;
    video.playsInline = true;
    // FIX: For REMOTE users, default to video-off (show avatar)
    // Track.enabled doesn't work across WebRTC for this purpose
    // We rely on data channel messages to show/hide video
    if (!isLocal && !isScreenBox) {
        wrapper.classList.add('video-off'); // Default: show avatar until we know video is on
    } else if (isLocal) {
        // For local, check track state
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack && !vTrack.enabled) wrapper.classList.add('video-off');
    }

    const avatarImg = document.createElement('img');
    avatarImg.className = 'video-avatar';
    // Use anime-style avatar with random seed if none provided
    avatarImg.src = avatar || getRandomAnimeAvatar(peerId || 'Anon');
    if (isScreenBox) avatarImg.style.display = 'none';

    const pinBtn = document.createElement('button');
    pinBtn.className = 'pin-btn';
    pinBtn.innerHTML = '<i class="fas fa-expand"></i>';
    pinBtn.onclick = (e) => { e.stopPropagation(); togglePin(wrapper); };
    if (isScreenBox) setTimeout(() => togglePin(wrapper), 100);

    wrapper.appendChild(video);
    if (!isScreenBox) wrapper.appendChild(avatarImg);
    wrapper.appendChild(pinBtn);

    if (!isScreenBox) {
        const aTrack = stream.getAudioTracks()[0];
        // For local user, also check if using dummy audio (permission denied)
        const isMicMuted = isLocal ?
            (usingDummyAudio || (aTrack && !aTrack.enabled)) :
            (aTrack && !aTrack.enabled);
        const micIcon = document.createElement('div');
        micIcon.className = 'mic-status' + (isMicMuted ? ' muted' : '');
        micIcon.innerHTML = `<i class="fas fa-microphone${isMicMuted ? '-slash' : ''}"></i>`;
        wrapper.appendChild(micIcon);
    }

    const nameTag = document.createElement('span');
    nameTag.className = 'name-tag';
    nameTag.innerText = isScreenBox ? `${name}'s Screen` : name;
    wrapper.appendChild(nameTag);

    if (amIHost && !isLocal && !isScreenBox && peerId) {
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';
        const muteBtn = document.createElement('button');
        muteBtn.className = 'overlay-btn';
        muteBtn.innerText = 'Mute Mic';
        muteBtn.onclick = () => sendAdminCommand('mute-mic', peerId);
        const kickBtn = document.createElement('button');
        kickBtn.className = 'overlay-btn danger';
        kickBtn.innerText = 'Kick';
        kickBtn.onclick = () => sendAdminCommand('kick', peerId);
        overlay.appendChild(muteBtn);
        overlay.appendChild(kickBtn);
        wrapper.appendChild(overlay);
    }

    videoGrid.append(wrapper);
    video.play().catch(() => { });
}

function togglePin(wrapper) {
    if (wrapper.classList.contains('pinned')) {
        wrapper.classList.remove('pinned');
        videoGrid.classList.remove('pinned-mode');
    } else {
        document.querySelector('.pinned')?.classList.remove('pinned');
        wrapper.classList.add('pinned');
        videoGrid.classList.add('pinned-mode');
    }
}

// ======================================================================
// ADMIN & CHAT
// ======================================================================

function sendAdminCommand(action, targetPeerId) {
    const conn = dataConnections[targetPeerId];
    if (conn && conn.open) {
        conn.send({ type: 'admin-action', action });
        if (action === 'mute-mic') broadcastData({ type: 'audio-state', enabled: false, fromPeer: targetPeerId });
    }
}

function handleAdminAction(action) {
    if (action === 'mute-mic' && localStream) {
        const track = localStream.getAudioTracks()[0];
        if (track) track.enabled = false;
        audioToggleBtn.classList.add('active');
        broadcastData({ type: 'audio-state', enabled: false, fromPeer: containerId });
        updateAudioState('local', false);
        showToast('Host muted your microphone');
    } else if (action === 'kick') {
        showToast('Removed by Host');
        setTimeout(() => window.location.href = window.location.pathname, 1500);
    }
}

function broadcastData(data, targetPeerId = null) {
    if (targetPeerId) {
        const conn = dataConnections[targetPeerId];
        if (conn && conn.open) conn.send(data);
        return;
    }
    for (let pid in dataConnections) {
        if (dataConnections[pid] && dataConnections[pid].open) dataConnections[pid].send(data);
    }
}

function handleChatMessage(data) {
    const isPrivate = data.type === 'private-chat';
    addMessageToUI(data.sender, data.message, false, isPrivate);
    playSound(audioMessage);
    if (!chatSidebar.classList.contains('active')) showChatPopup(data.sender, data.message);
}

chatToggleBtn.addEventListener('click', () => { chatSidebar.classList.toggle('active'); chatBadge.classList.add('hidden'); });
closeChatBtn.addEventListener('click', () => chatSidebar.classList.remove('active'));
sendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    const recipient = chatRecipient.value;
    const isPrivate = recipient !== 'everyone';

    addMessageToUI('You', msg, true, isPrivate);
    chatInput.value = '';

    if (isPrivate) {
        broadcastData({ type: 'private-chat', sender: myName, message: msg }, recipient);
    } else {
        broadcastData({ type: 'chat', sender: myName, message: msg });
    }
}

function addMessageToUI(sender, text, isSelf = false, isPrivate = false) {
    const div = document.createElement('div');
    div.className = `message ${isSelf ? 'self' : ''} ${isPrivate ? 'private' : ''}`;
    div.innerHTML = `<span class="message-sender">${sender}</span>${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (!isSelf && !chatSidebar.classList.contains('active')) chatBadge.classList.remove('hidden');
}

function showChatPopup(sender, msg) {
    const popup = document.createElement('div');
    popup.className = 'chat-popup';
    popup.innerHTML = `<h4>${sender}</h4><p>${msg}</p>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 4000);
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'message system';
    div.innerText = text;
    chatMessages.appendChild(div);
}

// ======================================================================
// SCREEN SHARE
// ======================================================================

screenShareBtn.addEventListener('click', async () => {
    if (isScreenSharing) { stopScreenShare(); return; }

    // Phase 5: Permission Check
    if (!amIHost && !amICoHost && !hasScreenSharePermission) {
        showToast('Requesting Screen Share permission...');
        broadcastData({ type: 'permission-request', requestType: 'screen-share', fromPeer: containerId });
        return;
    }

    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
            audio: false
        });

        // Reset permission if it was one-time
        if (!amIHost && !amICoHost) hasScreenSharePermission = false;

        addVideoStream(screenStream, true, myName, null, true, null, true);
        for (let peerId in peers) {
            const call = peer.call(peerId, screenStream, { metadata: { type: 'screen' } });
            peers[peerId].screenCall = call;
        }
        screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
        isScreenSharing = true;
        screenShareBtn.classList.add('active');
        showToast('Sharing Screen');
    } catch (err) {
        console.error(err);
        hasScreenSharePermission = false;
    }
});


function stopScreenShare() {
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    isScreenSharing = false;
    screenShareBtn.classList.remove('active');
    document.getElementById('wrapper-local-screen')?.remove();
    videoGrid.classList.remove('pinned-mode');
    for (let peerId in peers) {
        if (peers[peerId].screenCall) { peers[peerId].screenCall.close(); delete peers[peerId].screenCall; }
    }
    showToast('Screen Share Stopped');
}

// ======================================================================
// AV TOGGLES
// ======================================================================

videoToggleBtn.addEventListener('click', () => {
    if (usingDummyVideo) {
        // Always try to request permission when user explicitly clicks
        // Ask for camera permission (video only)
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                const newVideoTrack = stream.getVideoTracks()[0];
                const oldVideoTrack = localStream.getVideoTracks()[0];
                if (oldVideoTrack) { localStream.removeTrack(oldVideoTrack); oldVideoTrack.stop(); }
                localStream.addTrack(newVideoTrack);

                // Replace in peer connections
                for (let peerId in peers) {
                    const call = peers[peerId].mainCall;
                    if (call && call.peerConnection) {
                        const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (sender) sender.replaceTrack(newVideoTrack);
                    }
                }

                usingDummyVideo = false;
                videoToggleBtn.classList.remove('active');
                document.getElementById('wrapper-local')?.classList.remove('video-off');
                document.getElementById('wrapper-local').querySelector('video').srcObject = localStream;
                broadcastData({ type: 'video-state', enabled: true, fromPeer: containerId });
                showToast("Camera Enabled!");
            })
            .catch(() => {
                permissionRetryDone = true;
                showToast("Camera Permission Denied");
            });
        return;
    }
    if (localStream) {
        const track = localStream.getVideoTracks()[0];
        track.enabled = !track.enabled;
        videoToggleBtn.classList.toggle('active', !track.enabled);
        document.getElementById('wrapper-local')?.classList.toggle('video-off', !track.enabled);
        broadcastData({ type: 'video-state', enabled: track.enabled, fromPeer: containerId });
    }
});

audioToggleBtn.addEventListener('click', () => {
    if (usingDummyAudio) {
        // Always try to request permission when user explicitly clicks
        upgradeAudioOnly();
        return;
    }
    if (localStream) {
        const track = localStream.getAudioTracks()[0];
        track.enabled = !track.enabled;
        audioToggleBtn.classList.toggle('active', !track.enabled);
        broadcastData({ type: 'audio-state', enabled: track.enabled, fromPeer: containerId });
        updateAudioState('local', track.enabled);
    }
});

leaveBtn.addEventListener('click', () => window.location.href = window.location.pathname);
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?join=${containerId}`);
    showToast('Link Copied!');
});

function handlePeerError(err) {
    console.error("PeerJS Error:", err);
    if (err.type === 'peer-unavailable') {
        alert('Meeting Code Invalid/Expired');
        window.location.href = window.location.pathname;
    }
}

function updateClock() { clock.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function showToast(msg) { toast.innerText = msg; toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 3000); }
function playSound(audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => { }); }

// --- Loading Overlay Functions ---
function updateLoadingStatus(status) {
    if (loadingStatus) loadingStatus.innerText = status;
}

function hideLoadingOverlay() {
    if (meetingLoading && !isConnectionReady) {
        isConnectionReady = true;
        updateLoadingStatus('Connected!');
        playSound(audioJoin);
        setTimeout(() => {
            meetingLoading.classList.add('hidden');
        }, 500);
    }
}

// ======================================================================
// PHASE 1: QUICK WINS & CORE ENHANCEMENTS
// ======================================================================

// --- Meeting Timer ---
function updateMeetingTimer() {
    if (!meetingStartTime) return;
    const elapsed = Math.floor((Date.now() - meetingStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
        timerDisplay.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function startMeetingTimer() {
    meetingStartTime = Date.now();
    setInterval(updateMeetingTimer, 1000);
}

// --- Participant List ---
function updateParticipantCount() {
    const count = Object.keys(participantsData).length + 1; // +1 for self
    if (participantCount) participantCount.innerText = count;
    if (sidebarParticipantCount) sidebarParticipantCount.innerText = count;

    // Update Chat recipient dropdown
    if (chatRecipient) {
        const currentVal = chatRecipient.value;
        chatRecipient.innerHTML = '<option value="everyone">Everyone</option>';
        for (const pid in participantsData) {
            const opt = document.createElement('option');
            opt.value = pid;
            opt.textContent = participantsData[pid].name || 'User';
            chatRecipient.appendChild(opt);
        }
        chatRecipient.value = currentVal; // Restore selection if still present
        if (!chatRecipient.value) chatRecipient.value = 'everyone';
    }
}

function renderParticipantsList() {
    if (!participantsList) return;
    participantsList.innerHTML = '';

    // Add self first
    const selfItem = createParticipantItem('local', myName, myAvatar, amIHost, true, myHandRaised, usingDummyAudio);
    participantsList.appendChild(selfItem);

    // Add other participants
    for (const peerId in participantsData) {
        const p = participantsData[peerId];
        const item = createParticipantItem(peerId, p.name || 'User', p.avatar, false, false, p.handRaised, p.isMuted);
        participantsList.appendChild(item);
    }

    updateParticipantCount();
}

function createParticipantItem(peerId, name, avatar, isHost, isYou, handRaised, isMuted) {
    const item = document.createElement('div');
    const pData = participantsData[peerId] || {};
    const isCH = pData.isCoHost || (isYou && amICoHost);

    item.className = 'participant-item' + (isYou ? ' you' : '');
    item.id = `participant-${peerId}`;

    item.innerHTML = `
        <img class="participant-avatar" src="${avatar || getRandomAnimeAvatar(name)}" alt="${name}">
        <div class="participant-info">
            <div class="participant-name">${name}${isYou ? ' (You)' : ''}</div>
            <div class="participant-role ${isCH ? 'co-host' : ''}">${isHost ? 'Host' : (isCH ? 'Co-host' : 'Participant')}</div>
        </div>
        <div class="participant-status">
            ${handRaised ? '<i class="fas fa-hand-paper hand-raised"></i>' : ''}
            <i class="fas fa-microphone${isMuted ? '-slash muted' : ''}"></i>
            ${(amIHost || amICoHost) && !isYou && !isHost ? `
                <div class="participant-actions">
                    ${amIHost && !isCH ? `<i class="fas fa-shield-alt action-icon promote" title="Promote to Co-host" onclick="promoteToCoHost('${peerId}')"></i>` : ''}
                    <i class="fas fa-microphone-slash action-icon mute" title="Mute Participant" onclick="muteUser('${peerId}')"></i>
                    <i class="fas fa-user-slash action-icon ban" title="Ban/Kick User" onclick="banUser('${peerId}')"></i>
                </div>
            ` : ''}
        </div>
    `;

    return item;
}


// Participants sidebar toggle
if (participantsToggle) {
    participantsToggle.addEventListener('click', () => {
        participantsSidebar.classList.toggle('active');
        chatSidebar.classList.remove('active'); // Close chat if open
    });
}

if (closeParticipantsBtn) {
    closeParticipantsBtn.addEventListener('click', () => {
        participantsSidebar.classList.remove('active');
    });
}

// --- Hand Raise ---
if (handRaiseBtn) {
    handRaiseBtn.addEventListener('click', () => {
        myHandRaised = !myHandRaised;
        handRaiseBtn.classList.toggle('hand-raised', myHandRaised);

        // Update local video wrapper
        const localWrapper = document.getElementById('wrapper-local');
        if (localWrapper) {
            const existingIndicator = localWrapper.querySelector('.hand-indicator');
            if (myHandRaised && !existingIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'hand-indicator';
                indicator.innerHTML = '✋';
                localWrapper.appendChild(indicator);
            } else if (!myHandRaised && existingIndicator) {
                existingIndicator.remove();
            }
        }

        // Broadcast to others
        broadcastData({ type: 'hand-raise', raised: myHandRaised, fromPeer: containerId });
        renderParticipantsList();

        showToast(myHandRaised ? 'Hand Raised ✋' : 'Hand Lowered');
    });
}

function handleHandRaise(peerId, raised) {
    // Update participants data
    if (participantsData[peerId]) {
        participantsData[peerId].handRaised = raised;
    }

    // Update video wrapper
    const wrapper = document.getElementById(`wrapper-${peerId}`);
    if (wrapper) {
        const existingIndicator = wrapper.querySelector('.hand-indicator');
        if (raised && !existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'hand-indicator';
            indicator.innerHTML = '✋';
            wrapper.appendChild(indicator);
            showToast(`${participantsData[peerId]?.name || 'Someone'} raised their hand ✋`);
        } else if (!raised && existingIndicator) {
            existingIndicator.remove();
        }
    }

    renderParticipantsList();
}

// --- Emoji Reactions ---
const reactionsPanel = document.getElementById('reactions-panel');
const reactionsTrigger = document.getElementById('reactions-trigger');

// Toggle panel on click
if (reactionsTrigger && reactionsPanel) {
    reactionsTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        reactionsPanel.classList.toggle('active');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!reactionsTrigger.contains(e.target)) {
            reactionsPanel.classList.remove('active');
        }
    });
}

reactionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emoji = btn.dataset.emoji;
        sendReaction(emoji);
        // Close panel after sending
        if (reactionsPanel) reactionsPanel.classList.remove('active');
    });
});

function sendReaction(emoji) {
    showFloatingReaction(emoji);
    broadcastData({ type: 'reaction', emoji, fromPeer: containerId, senderName: myName });
}

function showFloatingReaction(emoji, senderName = null) {
    if (!reactionsContainer) return;

    const reaction = document.createElement('div');
    reaction.className = 'floating-reaction';
    reaction.innerText = emoji;
    reaction.style.left = `${Math.random() * 80 + 10}%`;

    reactionsContainer.appendChild(reaction);

    // Remove after animation
    setTimeout(() => reaction.remove(), 3000);

    if (senderName) {
        showToast(`${senderName} reacted ${emoji}`);
    }
}

function handleReaction(data) {
    showFloatingReaction(data.emoji, data.senderName);
}

// --- Mute All (Host Only) ---
if (muteAllBtn) {
    muteAllBtn.addEventListener('click', () => {
        if (!amIHost && !amICoHost) return;

        for (const peerId in dataConnections) {
            if (dataConnections[peerId] && dataConnections[peerId].open) {
                dataConnections[peerId].send({ type: 'admin-action', action: 'mute-mic' });
            }
        }

        showToast('Muted all participants');
    });
}

function showHostControls() {
    if (amIHost && muteAllBtn) {
        muteAllBtn.classList.remove('hidden');
    }
}

// --- Speaking Indicator ---
function setupSpeakingDetection(stream, peerId) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        audioAnalyzers[peerId] = { analyser, dataArray };

        // Start monitoring
        monitorAudioLevel(peerId);
    } catch (e) {
        console.warn('Could not setup speaking detection:', e);
    }
}

function monitorAudioLevel(peerId) {
    if (!audioAnalyzers[peerId]) return;

    const { analyser, dataArray } = audioAnalyzers[peerId];
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    // Update visualizer (Phase 3)
    updateVisualizer(peerId === 'local' ? 'local' : peerId, average);

    const wrapperId = peerId === 'local' ? 'wrapper-local' : `wrapper-${peerId}`;
    const wrapper = document.getElementById(wrapperId);

    if (wrapper) {
        if (average > 30) { // Speaking threshold
            wrapper.classList.add('speaking');
        } else {
            wrapper.classList.remove('speaking');
        }
    }

    // Continue monitoring
    requestAnimationFrame(() => monitorAudioLevel(peerId));
}

// Setup for local stream
function setupLocalSpeakingDetection() {
    if (localStream && !usingDummyAudio) {
        setupSpeakingDetection(localStream, 'local');
    }
}

// --- Initialize Phase 1 features when meeting starts ---
function initPhase1Features() {
    startMeetingTimer();
    showHostControls();
    renderParticipantsList();
    setupLocalSpeakingDetection();
}

// ======================================================================
// WAITING ROOM & PRIVATE MEETING SYSTEM
// ======================================================================

// Show waiting room for users joining private meetings
function showWaitingRoom() {
    lobbyView.classList.remove('active');
    meetingView.classList.remove('active');
    waitingRoomView.classList.add('active');

    if (waitingAvatar) waitingAvatar.src = myAvatar;
    if (waitingName) waitingName.innerText = myName;
    if (waitingStatus) waitingStatus.innerText = 'Waiting for the host to let you in...';

    waitingForApproval = true;
}

// Cancel waiting and go back
if (cancelJoinBtn) {
    cancelJoinBtn.addEventListener('click', () => {
        waitingRoomView.classList.remove('active');
        landingView.classList.add('active');
        waitingForApproval = false;
        if (peer) peer.destroy();
        peer = null;
    });
}

// Handle incoming join request (Host side)
function handleJoinRequest(conn, data) {
    if ((!amIHost && !amICoHost) || meetingType !== 'private') return;

    // Store the pending request
    pendingRequests[conn.peer] = {
        name: data.name,
        avatar: data.avatar,
        conn: conn,
        timestamp: Date.now()
    };

    // Play notification sound
    if (audioRequest) playSound(audioRequest);

    // Show join requests panel
    showJoinRequestsPanel();
    renderJoinRequests();

    showToast(`${data.name} wants to join`);
}

function showJoinRequestsPanel() {
    if (joinRequestsPanel && Object.keys(pendingRequests).length > 0) {
        joinRequestsPanel.classList.remove('hidden');
    }
}

function hideJoinRequestsPanel() {
    if (joinRequestsPanel) {
        joinRequestsPanel.classList.add('hidden');
    }
}

function renderJoinRequests() {
    if (!requestsList) return;
    requestsList.innerHTML = '';

    const count = Object.keys(pendingRequests).length;
    if (requestCount) requestCount.innerText = count;

    if (count === 0) {
        hideJoinRequestsPanel();
        return;
    }

    for (const peerId in pendingRequests) {
        const req = pendingRequests[peerId];
        const item = document.createElement('div');
        item.className = 'request-item';
        item.id = `request-${peerId}`;

        const timeAgo = Math.floor((Date.now() - req.timestamp) / 1000);
        const timeStr = timeAgo < 60 ? 'Just now' : `${Math.floor(timeAgo / 60)}m ago`;

        item.innerHTML = `
            <img src="${req.avatar || getRandomAnimeAvatar(req.name)}" alt="${req.name}">
            <div class="request-info">
                <div class="request-name">${req.name}</div>
                <div class="request-time">${timeStr}</div>
            </div>
            <div class="request-actions">
                <button class="approve-btn" title="Approve"><i class="fas fa-check"></i></button>
                <button class="deny-btn" title="Deny"><i class="fas fa-times"></i></button>
            </div>
        `;

        // Approve button
        item.querySelector('.approve-btn').addEventListener('click', () => approveJoinRequest(peerId));
        // Deny button
        item.querySelector('.deny-btn').addEventListener('click', () => denyJoinRequest(peerId));

        requestsList.appendChild(item);
    }
}

function approveJoinRequest(peerId) {
    const req = pendingRequests[peerId];
    if (!req || !req.conn) return;

    // Send approval
    req.conn.send({ type: 'join-approved' });

    // Remove from pending
    delete pendingRequests[peerId];

    showToast(`${req.name} joined the meeting`);
    playSound(audioJoin);
    renderJoinRequests();
}

function denyJoinRequest(peerId) {
    const req = pendingRequests[peerId];
    if (!req || !req.conn) return;

    // Send denial
    req.conn.send({ type: 'join-denied' });

    // Remove from pending and close connection
    delete pendingRequests[peerId];
    req.conn.close();

    showToast(`${req.name} was denied`);
    renderJoinRequests();
}

// Handle join approval/denial (Joiner side)
function handleJoinApproved() {
    waitingForApproval = false;
    waitingRoomView.classList.remove('active');

    // Show loading overlay for connection phase
    meetingView.classList.add('active');
    if (meetingLoading) meetingLoading.classList.remove('hidden');
    isConnectionReady = false;
    updateLoadingStatus('Connecting to meeting...');

    // Now actually join the meeting
    actuallyJoinMeeting();
}

function handleJoinDenied() {
    waitingForApproval = false;
    waitingRoomView.classList.remove('active');
    landingView.classList.add('active');

    if (peer) peer.destroy();
    peer = null;

    showToast('Your request to join was denied');
}

// Modified connection flow for private meetings
function requestToJoinMeeting(hostId) {
    updateLoadingStatus('Requesting to join...');
    hostPeerId = hostId;

    // Connect to host's data channel first
    const conn = peer.connect(hostId);
    handleDataConnection(conn);

    conn.on('open', () => {
        // Send join request with our info
        conn.send({
            type: 'join-request',
            name: myName,
            avatar: myAvatar,
            password: meetingPassword // Phase 3: Send password if we have it
        });


        // Timeout fallback for unresponsive host
        setTimeout(() => {
            if (!participantsData[hostId] && !waitingForApproval && !isConnectionReady) {
                console.log("No response from host, attempting direct join fallback...");
                actuallyJoinMeeting();
            }
        }, 5000); // 5s fallback
    });



    conn.on('error', (err) => {
        console.error('Join request error:', err);
        showToast('Could not connect to meeting');
        waitingRoomView.classList.remove('active');
        landingView.classList.add('active');
    });
}

function actuallyJoinMeeting() {
    // Local stream is already added in startMeeting()

    // Connect to host peer
    if (hostPeerId) {
        connectToPeer(hostPeerId);
    }

    updateHostUI();
    initPhase1Features();

    // Fallback: hide loading after 3 seconds if identity not received yet
    setTimeout(() => {
        hideLoadingOverlay();
    }, 3000);
}

// Role update for UI
function updateHostUI() {
    document.querySelectorAll('.host-only').forEach(el => {
        if (amIHost || amICoHost) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    if (meetingLockBtn && (amIHost || amICoHost)) {
        meetingLockBtn.classList.remove('hidden');
        meetingLockBtn.innerHTML = isMeetingLocked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-unlock"></i>';
        meetingLockBtn.classList.toggle('active', isMeetingLocked);
    }
}

// --- Emoji Picker ---
const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '奧', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'
];

if (emojiPicker) {
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn';
        btn.innerText = emoji;
        btn.onclick = () => {
            chatInput.value += emoji;
            chatInput.focus();
        };
        emojiPicker.appendChild(btn);
    });
}

if (emojiTrigger) {
    emojiTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
    });
}

document.addEventListener('click', (e) => {
    if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiTrigger) {
        emojiPicker.classList.add('hidden');
    }
});

// --- Polls ---
if (pollTrigger) pollTrigger.addEventListener('click', () => {
    pollModal.classList.add('active');
    if (!activePoll) {
        pollCreateView.classList.remove('hidden');
        pollActiveView.classList.add('hidden');
    } else {
        pollCreateView.classList.add('hidden');
        pollActiveView.classList.remove('hidden');
        renderActivePoll();
    }
});

if (viewPollBtn) viewPollBtn.addEventListener('click', () => {
    pollModal.classList.add('active');
    if (activePoll) {
        pollCreateView.classList.add('hidden');
        pollActiveView.classList.remove('hidden');
        renderActivePoll();
    }
});

if (deletePollBtnPinned) deletePollBtnPinned.addEventListener('click', deletePoll);
if (deletePollBtnModal) deletePollBtnModal.addEventListener('click', deletePoll);

if (closePollModal) closePollModal.addEventListener('click', () => pollModal.classList.remove('active'));

if (addOptionBtn) addOptionBtn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `<input type="text" class="poll-option-input" placeholder="Option ${pollOptionsContainer.children.length + 1}">`;
    pollOptionsContainer.appendChild(div);
});

if (createPollBtn) createPollBtn.addEventListener('click', () => {
    if (!amIHost && !amICoHost) return; // Host or Co-host
    const question = pollQuestionInput.value.trim();
    if (!question) return;

    const opInputs = document.querySelectorAll('.poll-option-input');
    const options = [];
    opInputs.forEach(input => {
        const val = input.value.trim();
        if (val) options.push({ text: val, votes: [] });
    });

    if (options.length < 2) {
        showToast("Add at least 2 options");
        return;
    }

    activePoll = { question, options, creator: containerId };
    broadcastData({ type: 'poll-create', poll: activePoll });
    renderActivePoll();
    updatePinnedPollUI();
    pollCreateView.classList.add('hidden');
    pollActiveView.classList.remove('hidden');
});

function handlePollReceive(poll) {
    activePoll = poll;
    hasVoted = false;
    showToast(`Poll: ${poll.question}`);
    addSystemMessage(`New Poll Created: ${poll.question}`);
    updatePinnedPollUI();
    if (pollModal.classList.contains('active')) renderActivePoll();
}

function deletePoll() {
    if (!amIHost && !amICoHost) return;
    activePoll = null;
    broadcastData({ type: 'poll-delete' });
    handlePollDelete();
}

function handlePollDelete() {
    activePoll = null;
    updatePinnedPollUI();
    pollModal.classList.remove('active');
    showToast("Poll deleted by host");
}

function updatePinnedPollUI() {
    if (!activePoll) {
        pinnedPollOverlay.classList.add('hidden');
        return;
    }

    pinnedPollOverlay.classList.remove('hidden');
    pinnedPollQuestion.innerText = activePoll.question;
    pinnedPollOptions.innerHTML = '';

    const totalVotes = activePoll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
    pinnedPollStatus.innerText = `${totalVotes} votes total`;

    if (!hasVoted) {
        activePoll.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'pinned-opt-btn';
            btn.innerText = opt.text;
            btn.onclick = () => votePoll(index);
            pinnedPollOptions.appendChild(btn);
        });
    } else {
        activePoll.options.forEach(opt => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
            const resDiv = document.createElement('div');
            resDiv.className = 'poll-option-result mini'; // mini class for overlay
            resDiv.innerHTML = `
                <div class="poll-option-header">
                    <span style="font-size: 11px;">${opt.text}</span>
                    <span style="font-size: 11px;">${percent}%</span>
                </div>
                <div class="poll-progress-bg" style="height: 6px;">
                    <div class="poll-progress-fill" style="width: ${percent}%"></div>
                </div>
            `;
            pinnedPollOptions.appendChild(resDiv);
        });
    }
}

function renderActivePoll() {
    if (!activePoll) return;
    activePollQuestion.innerText = activePoll.question;
    activePollOptions.innerHTML = '';

    const totalVotes = activePoll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
    pollVoteCount.innerText = `${totalVotes} votes`;

    activePoll.options.forEach((opt, index) => {
        const percent = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);

        const optDiv = document.createElement('div');
        optDiv.className = 'poll-option-result';
        optDiv.innerHTML = `
            <div class="poll-option-header">
                <span>${opt.text}</span>
                <span>${percent}% (${opt.votes.length})</span>
            </div>
            <div class="poll-progress-bg">
                <div class="poll-progress-fill" style="width: ${percent}%"></div>
            </div>
        `;

        if (!hasVoted) {
            optDiv.addEventListener('click', () => votePoll(index));
        }
        activePollOptions.appendChild(optDiv);
    });
}

function votePoll(index) {
    if (hasVoted) return;
    hasVoted = true;
    activePoll.options[index].votes.push(containerId);
    broadcastData({ type: 'poll-vote', pollId: activePoll.question, optionIndex: index, voterId: containerId });
    renderActivePoll();
    updatePinnedPollUI();
}

function handlePollVote(data) {
    if (!activePoll || activePoll.question !== data.pollId) return;
    // Check if duplicate vote
    const opt = activePoll.options[data.optionIndex];
    if (!opt.votes.includes(data.voterId)) {
        opt.votes.push(data.voterId);
        if (pollModal.classList.contains('active')) renderActivePoll();
        updatePinnedPollUI();
    }
}


// --- File Sharing ---
if (fileTrigger) fileTrigger.addEventListener('click', () => fileInput.click());

if (fileInput) fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
        showToast("File too large (max 10MB)");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const fileData = {
            type: 'file',
            sender: myName,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            data: reader.result
        };

        addFileMessageToUI('You', fileData, true);
        const recipient = chatRecipient.value;
        if (recipient !== 'everyone') {
            broadcastData(fileData, recipient);
        } else {
            broadcastData(fileData);
        }
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
});

function handleFileReceive(data) {
    addFileMessageToUI(data.sender, data, false);
    playSound(audioMessage);
    if (!chatSidebar.classList.contains('active')) showChatPopup(data.sender, `Shared a file: ${data.fileName}`);
}

function addFileMessageToUI(sender, fileData, isSelf = false) {
    const div = document.createElement('div');
    div.className = `message ${isSelf ? 'self' : ''}`;

    const sizeStr = fileData.fileSize > 1024 * 1024
        ? (fileData.fileSize / (1024 * 1024)).toFixed(1) + ' MB'
        : (fileData.fileSize / 1024).toFixed(1) + ' KB';

    div.innerHTML = `
        <span class="message-sender">${sender}</span>
        <div class="message-file">
            <i class="fas fa-file-alt"></i>
            <div class="file-info">
                <div class="file-name">${fileData.fileName}</div>
                <div class="file-size">${sizeStr}</div>
            </div>
            <a href="${fileData.data}" download="${fileData.fileName}" class="file-download">
                <i class="fas fa-download"></i>
            </a>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (!isSelf && !chatSidebar.classList.contains('active')) chatBadge.classList.remove('hidden');
}

// --- Video Tools (Mirror, PiP) ---
if (mirrorBtn) mirrorBtn.addEventListener('click', () => {
    isMirrored = !isMirrored;
    const localVideo = document.getElementById('wrapper-local')?.querySelector('video');
    if (localVideo) {
        localVideo.classList.toggle('mirrored', isMirrored);
        mirrorBtn.innerHTML = isMirrored ? '<i class="fas fa-arrows-alt-h"></i> Unmirror Video' : '<i class="fas fa-arrows-alt-h"></i> Mirror Video';
    }
});

if (pipBtn) pipBtn.addEventListener('click', async () => {
    const localVideo = document.getElementById('wrapper-local')?.querySelector('video');
    if (!localVideo) return;
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await localVideo.requestPictureInPicture();
        }
    } catch (e) {
        showToast("PiP not supported or failed");
    }
});

// --- Connection Quality ---
function updateConnectionQuality() {
    for (const peerId in peers) {
        const call = peers[peerId].mainCall;
        if (call && call.peerConnection) {
            call.peerConnection.getStats().then(stats => {
                let rtt = 0;
                stats.forEach(report => {
                    if (report.type === 'remote-candidate' && report.roundTripTime) {
                        rtt = report.roundTripTime * 1000;
                    }
                });
                updateQualityIndicator(peerId, rtt);
            });
        }
    }
}

function updateQualityIndicator(peerId, rtt) {
    const wrapper = document.getElementById(`wrapper-${peerId}`);
    if (!wrapper) return;

    let qualityClass = 'quality-good';
    let qualityText = 'Good';
    if (rtt > 300) { qualityClass = 'quality-poor'; qualityText = 'Poor'; }
    else if (rtt > 150) { qualityClass = 'quality-fair'; qualityText = 'Fair'; }

    let indicator = wrapper.querySelector('.connection-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'connection-indicator';
        wrapper.querySelector('.video-info').appendChild(indicator);
    }
    indicator.innerHTML = `<span class="connection-dot ${qualityClass}"></span> ${qualityText} (${Math.round(rtt)}ms)`;
}



// More Options Toggle
if (moreToggle) {
    moreToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        moreToggle.classList.toggle('active');
    });
}

// Close more options on outside click
document.addEventListener('click', (e) => {
    if (moreToggle && !moreToggle.contains(e.target)) {
        moreToggle.classList.remove('active');
    }
});

// Update handleChatMessage to remove GIF support
function handleChatMessage(data) {
    addMessageToUI(data.sender, data.message, data.type === 'private-chat');
    playSound(audioMessage);
    if (!chatSidebar.classList.contains('active')) showChatPopup(data.sender, data.message);
}

// --- Phase 3: Admin & Utilities ---

// Meeting Lock
if (meetingLockBtn) {
    meetingLockBtn.addEventListener('click', () => {
        if (!amIHost && !amICoHost) return;
        isMeetingLocked = !isMeetingLocked;
        broadcastData({ type: 'meeting-state', locked: isMeetingLocked });
        updateHostUI();
        updateMeetingBadge();
        showToast(isMeetingLocked ? 'Meeting locked' : 'Meeting unlocked');
    });
}

function updateMeetingBadge() {
    const badge = document.getElementById('meeting-type-badge');
    if (!badge) return;

    if (isMeetingLocked) {
        badge.innerText = 'Locked';
        badge.className = 'meeting-type-badge locked';
    } else {
        badge.innerText = meetingType === 'private' ? 'Private' : 'Public';
        badge.className = `meeting-type-badge ${meetingType}`;
    }
}


// Password Modal
if (submitPasswordBtn) {
    submitPasswordBtn.addEventListener('click', () => {
        meetingPassword = joinPasswordInput.value.trim();
        if (meetingPassword) {
            passwordModal.classList.remove('active');
            actuallyJoinMeeting();
        } else {
            showToast('Please enter password');
        }
    });
}

if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', () => {
        passwordModal.classList.remove('active');
        landingView.classList.add('active');
    });
}

// Admin Actions
function promoteToCoHost(peerId) {
    if (!amIHost) return;
    broadcastData({
        type: 'identity-update',
        fromPeer: peerId,
        update: { isCoHost: true }
    });
    if (participantsData[peerId]) participantsData[peerId].isCoHost = true;
    renderParticipantsList();
    showToast(`${participantsData[peerId]?.name || 'User'} promoted to Co-host`);
}

function banUser(peerId) {
    if (!amIHost && !amICoHost) return;
    const pName = participantsData[peerId]?.name || 'User';

    // Send kick message to user
    const conn = dataConnections[peerId];
    if (conn) {
        conn.send({ type: 'kick' });
        setTimeout(() => conn.close(), 500);
    }

    showToast(`${pName} was banned`);
    delete participantsData[peerId];
    renderParticipantsList();
}

function muteUser(peerId) {
    if (!amIHost && !amICoHost) return;
    const conn = dataConnections[peerId];
    if (conn) {
        conn.send({ type: 'admin-action', action: 'mute-mic' });
        showToast(`Muted ${participantsData[peerId]?.name || 'User'}`);
    }
}


// Recording
if (recordToggle) {
    recordToggle.addEventListener('click', toggleRecording);
}

async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: true
        });

        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `infinity-meet-record-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

            stream.getTracks().forEach(track => track.stop());
            isRecording = false;
            updateRecordingUI();
            showToast('Recording saved');
        };

        mediaRecorder.start();
        isRecording = true;
        updateRecordingUI();
        showToast('Recording started');
    } catch (err) {
        console.error("Error starting recording:", err);
        showToast('Could not start recording');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function updateRecordingUI() {
    if (recordToggle) {
        recordToggle.classList.toggle('recording', isRecording);
        const badge = recordToggle.querySelector('.record-badge');
        if (badge) badge.classList.toggle('hidden', !isRecording);
    }
}

// --- Phase 3 Part 2: Collaboration & Accessibility ---

// Collaborative Whiteboard
if (whiteboardToggle) {
    whiteboardToggle.addEventListener('click', () => {
        // Phase 5: Permission Check
        if (!amIHost && !amICoHost && !hasWhiteboardPermission) {
            showToast('Requesting Whiteboard permission...');
            broadcastData({ type: 'permission-request', requestType: 'whiteboard', fromPeer: containerId });
            return;
        }

        isWhiteboardOpen = !isWhiteboardOpen;
        whiteboardOverlay.classList.toggle('hidden', !isWhiteboardOpen);
        if (isWhiteboardOpen) {
            resizeCanvas();
            // Force open for everyone if host
            if (amIHost || amICoHost) broadcastData({ type: 'whiteboard-force-open' });
        } else {
            // Force close for everyone if host
            if (amIHost || amICoHost) broadcastData({ type: 'whiteboard-force-close' });
        }
    });
}


function resizeCanvas() {
    if (!whiteboardCanvas) return;
    const rect = whiteboardCanvas.parentElement.getBoundingClientRect();
    whiteboardCanvas.width = rect.width;
    whiteboardCanvas.height = rect.height;
}

if (whiteboardCanvas) {
    const ctx = whiteboardCanvas.getContext('2d');

    whiteboardCanvas.addEventListener('mousedown', (e) => {
        if (!amIHost && !amICoHost && !hasWhiteboardPermission) {
            showToast('You do not have permission to draw');
            return;
        }
        isDrawing = true;
        lastDrawCoords = { x: e.offsetX, y: e.offsetY };
    });

    whiteboardCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        if (!amIHost && !amICoHost && !hasWhiteboardPermission) return;

        const coords = { x: e.offsetX, y: e.offsetY };
        drawOnCanvas(lastDrawCoords, coords, whiteboardColor);

        // Broadcast (Scaled 0-1)
        broadcastData({
            type: 'whiteboard-draw',
            from: lastDrawCoords,
            to: coords,
            color: whiteboardColor,
            width: whiteboardCanvas.width,
            height: whiteboardCanvas.height
        });

        lastDrawCoords = coords;
    });

    window.addEventListener('mouseup', () => isDrawing = false);
}

function drawOnCanvas(from, to, color, remoteWidth, remoteHeight) {
    const ctx = whiteboardCanvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    let fX = from.x, fY = from.y, tX = to.x, tY = to.y;

    // Scale if remote
    if (remoteWidth && remoteHeight) {
        const scaleX = whiteboardCanvas.width / remoteWidth;
        const scaleY = whiteboardCanvas.height / remoteHeight;
        fX *= scaleX; fY *= scaleY; tX *= scaleX; tY *= scaleY;
    }

    ctx.beginPath();
    ctx.moveTo(fX, fY);
    ctx.lineTo(tX, tY);
    ctx.stroke();
}

function handleRemoteDraw(data) {
    if (!isWhiteboardOpen) {
        isWhiteboardOpen = true;
        whiteboardOverlay.classList.remove('hidden');
        resizeCanvas();
    }
    drawOnCanvas(data.from, data.to, data.color, data.width, data.height);
}

if (clearWhiteboardBtn) {
    clearWhiteboardBtn.addEventListener('click', () => {
        if (!amIHost && !amICoHost) return;
        clearLocalCanvas();
        broadcastData({ type: 'whiteboard-clear' });
    });
}


function clearLocalCanvas() {
    const ctx = whiteboardCanvas.getContext('2d');
    ctx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
}

if (closeWhiteboardBtn) {
    closeWhiteboardBtn.addEventListener('click', () => {
        isWhiteboardOpen = false;
        whiteboardOverlay.classList.add('hidden');
        // Phase 5: Force close for everyone if admin
        if (amIHost || amICoHost) {
            broadcastData({ type: 'whiteboard-force-close' });
        }
    });
}


// Live Captions
if (captionsBtn) {
    captionsBtn.addEventListener('click', toggleCaptions);
}

function toggleCaptions() {
    isCaptionsEnabled = !isCaptionsEnabled;
    captionsContainer.classList.toggle('hidden', !isCaptionsEnabled);
    captionsBtn.classList.toggle('active', isCaptionsEnabled);

    if (isCaptionsEnabled) {
        startSpeechRecognition();
    } else if (recognition) {
        recognition.stop();
    }
}

function startSpeechRecognition() {
    if (!SpeechRecognition) {
        showToast('Captions not supported in this browser');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            displayCaption(myName, finalTranscript);
            broadcastData({ type: 'caption', name: myName, text: finalTranscript });
        }
    };

    recognition.onerror = (event) => console.error('Speech recognition error', event.error);
    recognition.onend = () => { if (isCaptionsEnabled) recognition.start(); };
    recognition.start();
}

function displayCaption(name, text) {
    if (!captionsText) return;
    captionsText.innerHTML = `<strong>${name}:</strong> ${text}`;

    // Auto hide after 5s
    clearTimeout(captionsText.timer);
    captionsText.timer = setTimeout(() => {
        captionsText.innerHTML = '';
    }, 5000);
}

function handleRemoteCaption(data) {
    if (isCaptionsEnabled) {
        displayCaption(data.name, data.text);
    }
}

// Themes - REMOVED

// Audio Visualizer Integration (Update existing function)
function updateVisualizer(peerId, volume) {
    const wrapper = document.getElementById(`wrapper-${peerId}`);
    if (!wrapper) return;

    let visualizer = wrapper.querySelector('.visualizer-line');
    if (!visualizer) {
        visualizer = document.createElement('div');
        visualizer.className = 'visualizer-line';
        visualizer.innerHTML = '<div class="visualizer-bar"></div>';
        wrapper.appendChild(visualizer);
    }

    const bar = visualizer.querySelector('.visualizer-bar');
    if (bar) {
        // volume is 0-255, scale for UI
        const percent = Math.min(100, (volume / 128) * 100);
        bar.style.width = `${percent}%`;
        bar.style.opacity = percent > 10 ? '1' : '0.3';
    }
}

// Add call to updateVisualizer in monitorAudioLevel
// Assuming it's already defined above

// --- Phase 5: Permissions & Refinements ---

function handlePermissionRequest(data) {
    if (!permissionModal) return;

    const requesterName = participantsData[data.fromPeer]?.name || 'User';
    pendingPermissionRequest = { peerId: data.fromPeer, type: data.requestType };

    permissionTitle.innerText = 'Permission Request';
    permissionMessage.innerText = `${requesterName} wants to use ${data.requestType}. Allow?`;
    permissionModal.classList.add('active');
    playSound(audioRequest);
}

if (approvePermissionBtn) {
    approvePermissionBtn.addEventListener('click', () => {
        if (!pendingPermissionRequest) return;

        const conn = dataConnections[pendingPermissionRequest.peerId];
        if (conn) {
            conn.send({
                type: 'permission-response',
                approved: true,
                requestType: pendingPermissionRequest.type
            });
        }

        permissionModal.classList.remove('active');
        pendingPermissionRequest = null;
    });
}

if (denyPermissionBtn) {
    denyPermissionBtn.addEventListener('click', () => {
        if (!pendingPermissionRequest) return;

        const conn = dataConnections[pendingPermissionRequest.peerId];
        if (conn) {
            conn.send({
                type: 'permission-response',
                approved: false,
                requestType: pendingPermissionRequest.type
            });
        }

        permissionModal.classList.remove('active');
        pendingPermissionRequest = null;
    });
}

init();



