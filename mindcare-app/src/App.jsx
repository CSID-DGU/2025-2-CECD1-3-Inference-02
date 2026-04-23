import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000";

async function api(method, path, body = null, token = null) {
	const headers = { "Content-Type": "application/json" };
	if (token) headers["Authorization"] = `Bearer ${token}`;
	const res = await fetch(`${API_BASE}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : null,
	});
	if (!res.ok) {
		if (res.status === 401) {
			localStorage.removeItem("mindcare_auth");
			window.location.reload();
		}
		const err = await res.json().catch(() => ({}));
		const d = err.detail;
		const msg =
			typeof d === "string"
				? d
				: Array.isArray(d)
					? d.map((x) => x.msg || JSON.stringify(x)).join(", ")
					: "요청 실패";
		throw new Error(msg);
	}
	return res.json();
}

const theme = {
	bg: "#FFF9F0",
	card: "#FFFFFF",
	primary: "#FF8A65",
	primaryLight: "#FFF0E8",
	primaryDark: "#E65100",
	accent: "#66BB6A",
	accentLight: "#E8F5E9",
	text: "#37474F",
	textSub: "#78909C",
	textLight: "#B0BEC5",
	border: "#F0EBE3",
	danger: "#EF5350",
	shadow: "0 4px 20px rgba(255,138,101,0.08)",
	radius: "20px",
	radiusSm: "12px",
	blue: "#42A5F5",
	blueLight: "#E3F2FD",
	purple: "#AB47BC",
	purpleLight: "#F3E5F5",
	indigo: "#5C6BC0",
	indigoLight: "#E8EAF6",
	yellow: "#FFD54F",
	yellowLight: "#FFFDE7",
	pink: "#F48FB1",
	pinkLight: "#FCE4EC",
};

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Gowun Dodum','Noto Sans KR',sans-serif;background:${theme.bg};color:${theme.text};-webkit-font-smoothing:antialiased;}
input,textarea,button,select{font-family:inherit;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${theme.border};border-radius:4px;}
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes breathe{0%,100%{transform:scale(1);opacity:0.6;}50%{transform:scale(1.15);opacity:1;}}
@keyframes typing{0%{opacity:.2;}20%{opacity:1;}100%{opacity:.2;}}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
@keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
@keyframes pop{0%{transform:scale(0.8);opacity:0;}50%{transform:scale(1.05);}100%{transform:scale(1);opacity:1;}}
.fade-in-up{animation:fadeInUp 0.5s ease both;}.fade-in{animation:fadeIn 0.3s ease both;}
.float{animation:float 3s ease-in-out infinite;}
.pop{animation:pop 0.4s ease both;}
`;

const s = {
	page: {
		minHeight: "100vh",
		maxWidth: "430px",
		margin: "0 auto",
		position: "relative",
		background: theme.bg,
	},
	topBar: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "16px 20px",
		background: "transparent",
		position: "sticky",
		top: 0,
		zIndex: 10,
		backdropFilter: "blur(12px)",
		WebkitBackdropFilter: "blur(12px)",
	},
	topTitle: { fontSize: "18px", fontWeight: "600", color: theme.text },
	backBtn: {
		background: "none",
		border: "none",
		fontSize: "22px",
		cursor: "pointer",
		color: theme.text,
		padding: "4px",
	},
	card: {
		background: theme.card,
		borderRadius: theme.radius,
		padding: "20px",
		boxShadow: theme.shadow,
		marginBottom: "12px",
		border: `1px solid ${theme.border}`,
	},
	input: {
		width: "100%",
		padding: "14px 16px",
		borderRadius: theme.radiusSm,
		border: `1.5px solid ${theme.border}`,
		fontSize: "15px",
		outline: "none",
		background: "#FFFEFA",
		transition: "border 0.3s, box-shadow 0.3s",
	},
	btnPrimary: {
		width: "100%",
		padding: "16px",
		borderRadius: "24px",
		border: "none",
		background: `linear-gradient(135deg, ${theme.primary}, #FFAB91)`,
		color: "#fff",
		fontSize: "16px",
		fontWeight: "600",
		cursor: "pointer",
		boxShadow: "0 4px 16px rgba(255,138,101,0.3)",
		transition: "transform 0.2s, box-shadow 0.2s",
	},
	btnOutline: {
		padding: "10px 20px",
		borderRadius: "24px",
		border: `1.5px solid ${theme.primary}`,
		background: "transparent",
		color: theme.primary,
		fontSize: "14px",
		fontWeight: "500",
		cursor: "pointer",
		transition: "all 0.2s",
	},
	label: {
		fontSize: "13px",
		fontWeight: "500",
		color: theme.textSub,
		marginBottom: "6px",
		display: "block",
	},
	nav: {
		display: "flex",
		justifyContent: "space-around",
		alignItems: "center",
		padding: "10px 0 20px",
		background: "rgba(255,255,255,0.95)",
		backdropFilter: "blur(12px)",
		WebkitBackdropFilter: "blur(12px)",
		borderTop: `1px solid ${theme.border}`,
		position: "fixed",
		bottom: 0,
		left: "50%",
		transform: "translateX(-50%)",
		width: "100%",
		maxWidth: "430px",
		zIndex: 20,
		borderRadius: "20px 20px 0 0",
	},
	navItem: (a) => ({
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "3px",
		background: "none",
		border: "none",
		cursor: "pointer",
		color: a ? theme.primary : theme.textLight,
		fontSize: "10px",
		fontWeight: a ? "600" : "400",
		transition: "all 0.2s",
		transform: a ? "scale(1.1)" : "scale(1)",
	}),
	navIcon: { fontSize: "22px" },
};

const moods = [
	{ emoji: "😊", label: "좋음" },
	{ emoji: "😐", label: "보통" },
	{ emoji: "😢", label: "슬픔" },
	{ emoji: "😞", label: "우울" },
	{ emoji: "😤", label: "화남" },
	{ emoji: "😰", label: "불안" },
	{ emoji: "😫", label: "지침" },
	{ emoji: "🥰", label: "뿌듯" },
];
const Icons = { back: "←", send: "➤", plus: "+", check: "✓" };
const dateStr = (d) => {
	const dt = d || new Date();
	return (
		dt.getFullYear() +
		"-" +
		String(dt.getMonth() + 1).padStart(2, "0") +
		"-" +
		String(dt.getDate()).padStart(2, "0")
	);
};
const todayStr = () => dateStr(new Date());
const fmtDate = (ds) => {
	const p = ds.split("-");
	return `${parseInt(p[1])}월 ${parseInt(p[2])}일`;
};

// ============================================================
// APP
// ============================================================
export default function App() {
	const [page, setPage] = useState("loading");
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [selectedDate, setSelectedDate] = useState(todayStr());
	const [selectedPatient, setSelectedPatient] = useState(null); // 의사가 보고 있는 환자

	useEffect(() => {
		try {
			const saved = localStorage.getItem("mindcare_auth");
			if (saved) {
				const data = JSON.parse(saved);
				if (data.user && data.token) {
					setUser(data.user);
					setToken(data.token);
					setPage(
						data.user.role === "doctor" ? "doctorHome" : "home",
					);
					return;
				}
			}
		} catch (e) {}
		setPage("login");
	}, []);

	const handleLogin = (d) => {
		setUser(d);
		setToken(d.access_token);
		setPage(d.role === "doctor" ? "doctorHome" : "home");
		localStorage.setItem(
			"mindcare_auth",
			JSON.stringify({ user: d, token: d.access_token }),
		);
	};
	const handleLogout = () => {
		setUser(null);
		setToken(null);
		setPage("login");
		localStorage.removeItem("mindcare_auth");
	};
	const nav = (p) => setPage(p);

	if (page === "loading")
		return (
			<>
				<style>{globalStyles}</style>
				<div
					style={{
						...s.page,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "100vh",
						background: `linear-gradient(180deg, #FFF9F0 0%, #FFE8D6 100%)`,
					}}
				>
					<div style={{ textAlign: "center" }}>
						<p
							className="float"
							style={{ fontSize: "56px", marginBottom: "12px" }}
						>
							🌻
						</p>
						<p style={{ fontSize: "14px", color: theme.textSub }}>
							불러오는 중...
						</p>
					</div>
				</div>
			</>
		);

	const isDoctor = user?.role === "doctor";
	return (
		<>
			<style>{globalStyles}</style>
			<div style={s.page}>
				{page === "login" && (
					<LoginPage
						onLogin={handleLogin}
						onGoRegister={() => setPage("register")}
					/>
				)}
				{page === "register" && (
					<RegisterPage
						onBack={() => setPage("login")}
						onSuccess={() => setPage("login")}
					/>
				)}
				{/* 일반 사용자 */}
				{!isDoctor && page === "home" && (
					<HomePage
						user={user}
						token={token}
						navigate={nav}
						selectedDate={selectedDate}
						setSelectedDate={setSelectedDate}
					/>
				)}
				{!isDoctor && page === "chat" && (
					<ChatPage user={user} token={token} navigate={nav} />
				)}
				{!isDoctor && page === "routine" && (
					<DailyTalkPage
						user={user}
						token={token}
						navigate={nav}
						targetDate={selectedDate}
					/>
				)}
				{!isDoctor && page === "dayDetail" && (
					<DayDetailPage
						user={user}
						token={token}
						navigate={nav}
						targetDate={selectedDate}
					/>
				)}
				{!isDoctor && page === "chatLogs" && (
					<ChatLogsPage token={token} navigate={nav} />
				)}
				{!isDoctor && page === "report" && (
					<ReportPage token={token} navigate={nav} />
				)}
				{!isDoctor && page === "sleep" && (
					<SleepPage
						user={user}
						token={token}
						navigate={nav}
						targetDate={selectedDate}
					/>
				)}
				{page === "mypage" && (
					<MyPage
						user={user}
						onLogout={handleLogout}
						navigate={nav}
					/>
				)}
				{/* 의사 */}
				{isDoctor && page === "doctorHome" && (
					<DoctorHome
						user={user}
						token={token}
						navigate={nav}
						setSelectedPatient={setSelectedPatient}
					/>
				)}
				{isDoctor && page === "doctorPatient" && (
					<DoctorPatientDetail
						user={user}
						token={token}
						navigate={nav}
						patientId={selectedPatient}
					/>
				)}
				{/* 하단 네비 */}
				{user &&
					!isDoctor &&
					!["login", "register", "chat", "routine"].includes(
						page,
					) && <BottomNav current={page} navigate={nav} />}
				{user &&
					isDoctor &&
					!["login", "register", "doctorPatient", "mypage"].includes(
						page,
					) && <DoctorBottomNav current={page} navigate={nav} />}
			</div>
		</>
	);
}

function BottomNav({ current, navigate }) {
	const tabs = [
		{ id: "home", icon: "🏠", label: "홈" },
		{ id: "chat", icon: "💬", label: "상담" },
		{ id: "report", icon: "📊", label: "리포트" },
		{ id: "mypage", icon: "👤", label: "내 정보" },
	];
	return (
		<nav style={s.nav}>
			{tabs.map((t) => (
				<button
					key={t.id}
					style={s.navItem(current === t.id)}
					onClick={() => navigate(t.id)}
				>
					<span style={s.navIcon}>{t.icon}</span>
					<span>{t.label}</span>
				</button>
			))}
		</nav>
	);
}

// ============================================================
// LOGIN / REGISTER
// ============================================================
function LoginPage({ onLogin, onGoRegister }) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const submit = async () => {
		if (!username || !password) {
			setError("아이디와 비밀번호를 입력해주세요.");
			return;
		}
		setLoading(true);
		setError("");
		try {
			onLogin(await api("POST", "/login", { username, password }));
		} catch (e) {
			setError(e.message);
		}
		setLoading(false);
	};
	return (
		<div
			style={{
				...s.page,
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				padding: "40px 24px",
				minHeight: "100vh",
				background: `linear-gradient(180deg, #FFF9F0 0%, #FFE8D6 100%)`,
			}}
		>
			<div className="fade-in-up">
				<div style={{ textAlign: "center", marginBottom: "48px" }}>
					<div
						className="float"
						style={{ fontSize: "56px", marginBottom: "16px" }}
					>
						🌻
					</div>
					<h1
						style={{
							fontSize: "28px",
							fontWeight: "700",
							marginBottom: "8px",
							background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						마음돌봄
					</h1>
					<p style={{ fontSize: "14px", color: theme.textSub }}>
						당신의 하루를 함께 돌보는 AI 상담 서비스
					</p>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "14px",
						marginBottom: "24px",
					}}
				>
					<div>
						<label style={s.label}>아이디</label>
						<input
							style={s.input}
							placeholder="아이디"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>
					<div>
						<label style={s.label}>비밀번호</label>
						<input
							style={s.input}
							type="password"
							placeholder="비밀번호"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && submit()}
						/>
					</div>
				</div>
				{error && (
					<p
						style={{
							color: theme.danger,
							fontSize: "13px",
							marginBottom: "12px",
							textAlign: "center",
						}}
					>
						{error}
					</p>
				)}
				<button
					style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}
					onClick={submit}
					disabled={loading}
				>
					{loading ? "로그인 중..." : "로그인"}
				</button>
				<p
					style={{
						textAlign: "center",
						marginTop: "20px",
						fontSize: "14px",
						color: theme.textSub,
					}}
				>
					계정이 없으신가요?{" "}
					<span
						style={{
							color: theme.primary,
							fontWeight: "600",
							cursor: "pointer",
						}}
						onClick={onGoRegister}
					>
						회원가입
					</span>
				</p>
			</div>
		</div>
	);
}

function RegisterPage({ onBack, onSuccess }) {
	const [form, setForm] = useState({
		username: "",
		password: "",
		passwordConfirm: "",
		nickname: "",
		age: "",
		gender: "",
		role: "user",
		specialty: "",
		license_number: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const u = (k, v) => setForm((f) => ({ ...f, [k]: v }));
	const submit = async () => {
		if (!form.username || !form.password || !form.nickname) {
			setError("아이디, 비밀번호, 닉네임을 입력해주세요.");
			return;
		}
		if (form.password.length < 8) {
			setError("비밀번호는 8자 이상이어야 합니다.");
			return;
		}
		if (form.password !== form.passwordConfirm) {
			setError("비밀번호가 일치하지 않습니다.");
			return;
		}
		if (form.role === "user" && (!form.age || !form.gender)) {
			setError("나이와 성별을 입력해주세요.");
			return;
		}
		if (
			form.role === "doctor" &&
			(!form.specialty || !form.license_number)
		) {
			setError("전문 분야와 면허 번호를 입력해주세요.");
			return;
		}
		setLoading(true);
		setError("");
		try {
			const body = { ...form, age: form.age ? parseInt(form.age) : null };
			delete body.passwordConfirm;
			await api("POST", "/register", body);
			alert(
				form.role === "doctor"
					? "의사 계정 생성 완료!"
					: "회원가입 완료!",
			);
			onSuccess();
		} catch (e) {
			setError(e.message);
		}
		setLoading(false);
	};
	return (
		<div style={{ ...s.page, padding: "0 24px", minHeight: "100vh" }}>
			<div style={s.topBar}>
				<button style={s.backBtn} onClick={onBack}>
					{Icons.back}
				</button>
				<span style={s.topTitle}>회원가입</span>
				<div style={{ width: "30px" }} />
			</div>
			<div
				className="fade-in-up"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					paddingBottom: "40px",
				}}
			>
				{/* 역할 선택 */}
				<div>
					<label style={s.label}>가입 유형</label>
					<div style={{ display: "flex", gap: "8px" }}>
						<button
							onClick={() => u("role", "user")}
							style={{
								flex: 1,
								padding: "16px 12px",
								borderRadius: theme.radiusSm,
								border: `2px solid ${form.role === "user" ? theme.primary : theme.border}`,
								background:
									form.role === "user"
										? theme.primaryLight
										: theme.card,
								color:
									form.role === "user"
										? theme.primaryDark
										: theme.textSub,
								fontSize: "14px",
								fontWeight: "600",
								cursor: "pointer",
								textAlign: "center",
							}}
						>
							🌱 일반 사용자
							<br />
							<span
								style={{ fontSize: "11px", fontWeight: "400" }}
							>
								AI와 상담
							</span>
						</button>
						<button
							onClick={() => u("role", "doctor")}
							style={{
								flex: 1,
								padding: "16px 12px",
								borderRadius: theme.radiusSm,
								border: `2px solid ${form.role === "doctor" ? theme.blue : theme.border}`,
								background:
									form.role === "doctor"
										? theme.blueLight
										: theme.card,
								color:
									form.role === "doctor"
										? theme.blue
										: theme.textSub,
								fontSize: "14px",
								fontWeight: "600",
								cursor: "pointer",
								textAlign: "center",
							}}
						>
							👨‍⚕️ 의사
							<br />
							<span
								style={{ fontSize: "11px", fontWeight: "400" }}
							>
								환자 관리
							</span>
						</button>
					</div>
				</div>
				<div>
					<label style={s.label}>아이디</label>
					<input
						style={s.input}
						placeholder="영문/숫자"
						value={form.username}
						onChange={(e) => u("username", e.target.value)}
					/>
				</div>
				<div>
					<label style={s.label}>비밀번호</label>
					<input
						style={s.input}
						type="password"
						placeholder="8자 이상, 영문+숫자"
						value={form.password}
						onChange={(e) => u("password", e.target.value)}
					/>
				</div>
				<div>
					<label style={s.label}>비밀번호 확인</label>
					<input
						style={{
							...s.input,
							borderColor:
								form.passwordConfirm &&
								form.password !== form.passwordConfirm
									? theme.danger
									: theme.border,
						}}
						type="password"
						placeholder="비밀번호를 다시 입력"
						value={form.passwordConfirm}
						onChange={(e) => u("passwordConfirm", e.target.value)}
					/>
					{form.passwordConfirm &&
						form.password !== form.passwordConfirm && (
							<p
								style={{
									fontSize: "11px",
									color: theme.danger,
									marginTop: "4px",
								}}
							>
								비밀번호가 일치하지 않습니다
							</p>
						)}
					{form.passwordConfirm &&
						form.password === form.passwordConfirm && (
							<p
								style={{
									fontSize: "11px",
									color: theme.accent,
									marginTop: "4px",
								}}
							>
								비밀번호가 일치합니다 ✓
							</p>
						)}
				</div>
				<div>
					<label style={s.label}>
						{form.role === "doctor" ? "이름" : "닉네임"}
					</label>
					<input
						style={s.input}
						placeholder={form.role === "doctor" ? "실명" : "닉네임"}
						value={form.nickname}
						onChange={(e) => u("nickname", e.target.value)}
					/>
				</div>
				{form.role === "user" ? (
					<>
						<div>
							<label style={s.label}>나이</label>
							<input
								style={s.input}
								type="number"
								placeholder="나이"
								value={form.age}
								onChange={(e) => u("age", e.target.value)}
							/>
						</div>
						<div>
							<label style={s.label}>성별</label>
							<div style={{ display: "flex", gap: "8px" }}>
								{["남성", "여성", "기타"].map((g) => (
									<button
										key={g}
										onClick={() => u("gender", g)}
										style={{
											flex: 1,
											padding: "12px",
											borderRadius: theme.radiusSm,
											border: `1.5px solid ${form.gender === g ? theme.primary : theme.border}`,
											background:
												form.gender === g
													? theme.primaryLight
													: theme.card,
											color:
												form.gender === g
													? theme.primaryDark
													: theme.textSub,
											fontSize: "14px",
											fontWeight: "500",
											cursor: "pointer",
										}}
									>
										{g}
									</button>
								))}
							</div>
						</div>
					</>
				) : (
					<>
						<div>
							<label style={s.label}>전문 분야</label>
							<input
								style={s.input}
								placeholder="정신건강의학과, 상담심리 등"
								value={form.specialty}
								onChange={(e) => u("specialty", e.target.value)}
							/>
						</div>
						<div>
							<label style={s.label}>면허 번호</label>
							<input
								style={s.input}
								placeholder="의사 면허 번호"
								value={form.license_number}
								onChange={(e) =>
									u("license_number", e.target.value)
								}
							/>
						</div>
					</>
				)}
				{error && (
					<p
						style={{
							color: theme.danger,
							fontSize: "13px",
							textAlign: "center",
						}}
					>
						{error}
					</p>
				)}
				<button
					style={{
						...s.btnPrimary,
						marginTop: "8px",
						opacity: loading ? 0.7 : 1,
						background:
							form.role === "doctor"
								? `linear-gradient(135deg, ${theme.blue}, #64B5F6)`
								: `linear-gradient(135deg, ${theme.primary}, #FFAB91)`,
					}}
					onClick={submit}
					disabled={loading}
				>
					{loading ? "가입 중..." : "가입하기"}
				</button>
			</div>
		</div>
	);
}

// ============================================================
// HOME — 캘린더 + 오늘의 할 일 + 날짜별 기록
// ============================================================
function HomePage({ user, token, navigate, selectedDate, setSelectedDate }) {
	const [calMonth, setCalMonth] = useState(new Date());
	const [diaries, setDiaries] = useState([]);
	const [sleepLogs, setSleepLogs] = useState([]);
	const [chatLogs, setChatLogs] = useState([]);
	const [loading, setLoading] = useState(true);

	const reload = async () => {
		try {
			const [d, sl, cl] = await Promise.all([
				api("GET", "/diary/list", null, token),
				api("GET", "/sleep/logs", null, token),
				api("GET", "/chat/logs?limit=200", null, token),
			]);
			setDiaries(d);
			setSleepLogs(sl);
			setChatLogs(cl);
		} catch (e) {}
		setLoading(false);
	};
	useEffect(() => {
		reload();
	}, []);

	const hour = new Date().getHours();
	const greeting =
		hour < 12
			? "좋은 아침이에요"
			: hour < 18
				? "좋은 오후예요"
				: "편안한 저녁이에요";
	const isToday = selectedDate === todayStr();
	const isFuture = selectedDate > todayStr();
	const canRecord = !isFuture;
	const selDateLabel = isToday ? "오늘" : fmtDate(selectedDate);

	const year = calMonth.getFullYear();
	const month = calMonth.getMonth();
	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const weeks = [];
	let week = Array(firstDay).fill(null);
	for (let d = 1; d <= daysInMonth; d++) {
		week.push(d);
		if (week.length === 7) {
			weeks.push(week);
			week = [];
		}
	}
	if (week.length > 0) {
		while (week.length < 7) week.push(null);
		weeks.push(week);
	}

	const moodMap = {};
	diaries.forEach((d) => {
		moodMap[d.created_date] = d.mood;
	});
	const selDiary = diaries.find((d) => d.created_date === selectedDate);
	const selSleep = sleepLogs.find((sl) => sl.date === selectedDate);

	const todayDiary = diaries.find((d) => d.created_date === todayStr());
	const todaySleep = sleepLogs.find((sl) => sl.date === todayStr());
	const sleepDone = !!todaySleep;
	const diaryDone = !!todayDiary;
	const tasks = [
		{
			done: sleepDone,
			label: "수면 기록",
			icon: "🌙",
			page: "sleep",
			desc: "어젯밤 잠은 어땠나요?",
			locked: false,
		},
		{
			done: diaryDone,
			label: "하루 돌아보기",
			icon: "💭",
			page: "routine",
			desc: sleepDone
				? "오늘 하루를 이야기해요"
				: "수면 기록을 먼저 완료해주세요",
			locked: !sleepDone,
		},
	];
	const doneTasks = tasks.filter((t) => t.done).length;

	// 선택 날짜의 수면 완료 여부 (과거 날짜용)
	const selSleepDone = !!selSleep;
	// 선택 날짜에 대화가 진행 중인지 (일기는 없지만 대화 기록은 있는 상태)
	const selHasChat = chatLogs.some(
		(l) =>
			l.target_date === selectedDate ||
			(l.created_date && l.created_date.startsWith(selectedDate)),
	);
	const selInProgress = !selDiary && selHasChat; // 대화 중이지만 완료 안 됨

	return (
		<div style={{ ...s.page, padding: "0 20px 100px" }}>
			{/* 상단 */}
			<div
				style={{
					padding: "20px 0 16px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
				className="fade-in-up"
			>
				<div>
					<p style={{ fontSize: "13px", color: theme.textSub }}>
						{greeting} ☀️
					</p>
					<h2
						style={{
							fontSize: "22px",
							fontWeight: "700",
							marginTop: "2px",
							color: theme.text,
						}}
					>
						{user?.nickname || "사용자"}님{" "}
						<span style={{ fontSize: "18px" }}>👋</span>
					</h2>
				</div>
				<button
					onClick={() => navigate("mypage")}
					style={{
						width: "40px",
						height: "40px",
						borderRadius: "50%",
						background: `linear-gradient(135deg, ${theme.primary}, #FFAB91)`,
						border: "none",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "17px",
						color: "#fff",
						boxShadow: "0 3px 12px rgba(255,138,101,0.3)",
					}}
				>
					{(user?.nickname || "?").charAt(0)}
				</button>
			</div>

			{/* 오늘의 할 일 */}
			{isToday && (
				<div
					className="fade-in-up"
					style={{
						...s.card,
						padding: "18px 20px",
						marginBottom: "16px",
						background: `linear-gradient(135deg, ${theme.yellowLight}, #FFF9F0)`,
						border: `1px solid ${theme.yellow}40`,
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "14px",
						}}
					>
						<p style={{ fontSize: "15px", fontWeight: "700" }}>
							✨ 오늘의 할 일
						</p>
						<span
							style={{
								fontSize: "12px",
								color: theme.primary,
								fontWeight: "600",
								background: theme.primaryLight,
								padding: "3px 10px",
								borderRadius: "12px",
							}}
						>
							{doneTasks}/{tasks.length}
						</span>
					</div>
					{tasks.map((t, i) => (
						<button
							key={i}
							onClick={() => {
								if (t.locked) {
									alert("수면 기록을 먼저 완료해주세요!");
									navigate("sleep");
									return;
								}
								navigate(t.page);
							}}
							style={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: "12px",
								padding: "12px 0",
								background: "none",
								border: "none",
								cursor: t.locked ? "default" : "pointer",
								borderTop:
									i > 0
										? `1px solid ${theme.border}`
										: "none",
								textAlign: "left",
								opacity: t.locked ? 0.5 : 1,
							}}
						>
							<div
								style={{
									width: "28px",
									height: "28px",
									borderRadius: "50%",
									border: `2px solid ${t.done ? theme.primary : t.locked ? theme.textLight : theme.border}`,
									background: t.done
										? theme.primary
										: "transparent",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#fff",
									fontSize: "14px",
									flexShrink: 0,
								}}
							>
								{t.done ? Icons.check : t.locked ? "🔒" : ""}
							</div>
							<div style={{ flex: 1 }}>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "500",
										color: t.locked
											? theme.textLight
											: theme.text,
									}}
								>
									{t.icon} {t.label}
								</p>
								<p
									style={{
										fontSize: "12px",
										color: t.done
											? theme.primary
											: t.locked
												? theme.textLight
												: theme.textLight,
									}}
								>
									{t.done ? "완료! 눌러서 확인하기" : t.desc}
								</p>
							</div>
							{!t.locked && (
								<span
									style={{
										fontSize: "14px",
										color: theme.primary,
									}}
								>
									→
								</span>
							)}
						</button>
					))}
				</div>
			)}

			{/* 캘린더 */}
			<div className="fade-in-up" style={{ ...s.card, padding: "18px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "14px",
					}}
				>
					<button
						onClick={() =>
							setCalMonth(new Date(year, month - 1, 1))
						}
						style={{
							background: "none",
							border: "none",
							fontSize: "18px",
							cursor: "pointer",
							color: theme.textSub,
							padding: "4px 8px",
						}}
					>
						‹
					</button>
					<p style={{ fontSize: "15px", fontWeight: "700" }}>
						{year}년 {month + 1}월
					</p>
					<button
						onClick={() =>
							setCalMonth(new Date(year, month + 1, 1))
						}
						style={{
							background: "none",
							border: "none",
							fontSize: "18px",
							cursor: "pointer",
							color: theme.textSub,
							padding: "4px 8px",
						}}
					>
						›
					</button>
				</div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(7,1fr)",
						gap: "2px",
						marginBottom: "4px",
					}}
				>
					{["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
						<div
							key={d}
							style={{
								textAlign: "center",
								fontSize: "11px",
								color:
									i === 0
										? theme.danger
										: i === 6
											? theme.blue
											: theme.textLight,
								fontWeight: "500",
								padding: "4px 0",
							}}
						>
							{d}
						</div>
					))}
				</div>
				{weeks.map((wk, wi) => (
					<div
						key={wi}
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(7,1fr)",
							gap: "2px",
						}}
					>
						{wk.map((day, di) => {
							if (!day) return <div key={di} />;
							const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
							const isSel = ds === selectedDate;
							const isTd = ds === todayStr();
							const mood = moodMap[ds];
							return (
								<button
									key={di}
									onClick={() => setSelectedDate(ds)}
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: "1px",
										padding: "6px 2px",
										borderRadius: "10px",
										border: "none",
										cursor: "pointer",
										background: isSel
											? theme.primaryLight
											: isTd
												? "#f0f0ec"
												: "transparent",
									}}
								>
									<span
										style={{
											fontSize: "12px",
											fontWeight:
												isSel || isTd ? "700" : "400",
											color: isSel
												? theme.primaryDark
												: di === 0
													? theme.danger
													: di === 6
														? theme.blue
														: theme.text,
										}}
									>
										{day}
									</span>
									<span
										style={{
											fontSize: "12px",
											height: "16px",
										}}
									>
										{mood || ""}
									</span>
								</button>
							);
						})}
					</div>
				))}
			</div>

			{/* 선택 날짜 기록 */}
			<div className="fade-in-up" style={{ marginTop: "4px" }}>
				<p
					style={{
						fontSize: "14px",
						fontWeight: "600",
						padding: "8px 4px",
					}}
				>
					{selDateLabel} 기록
				</p>
				{isFuture ? (
					<div
						style={{
							...s.card,
							padding: "20px",
							textAlign: "center",
							color: theme.textLight,
						}}
					>
						<p style={{ fontSize: "13px" }}>
							미래 날짜는 기록할 수 없어요
						</p>
					</div>
				) : (
					<>
						{/* 수면 */}
						{selSleep ? (
							<button
								onClick={() => navigate("sleep")}
								style={{
									...s.card,
									width: "100%",
									display: "flex",
									alignItems: "center",
									gap: "14px",
									padding: "16px 20px",
									border: "none",
									cursor: "pointer",
									textAlign: "left",
								}}
							>
								<span style={{ fontSize: "24px" }}>
									{selSleep.quality === "good"
										? "😴"
										: selSleep.quality === "fair"
											? "😐"
											: "😵"}
								</span>
								<div style={{ flex: 1 }}>
									<p
										style={{
											fontSize: "14px",
											fontWeight: "600",
										}}
									>
										수면 {selSleep.hours}시간
									</p>
									<p
										style={{
											fontSize: "12px",
											color: theme.textSub,
										}}
									>
										{selSleep.bedtime} ~ {selSleep.wakeup}
									</p>
								</div>
								<span
									style={{
										fontSize: "11px",
										color: theme.primary,
									}}
								>
									수정 →
								</span>
							</button>
						) : (
							<div
								style={{
									...s.card,
									padding: "16px 20px",
									display: "flex",
									alignItems: "center",
									gap: "12px",
									color: theme.textLight,
								}}
							>
								<span style={{ fontSize: "20px" }}>🌙</span>
								<p style={{ fontSize: "13px" }}>
									수면 기록이 없어요
								</p>
								{canRecord && (
									<button
										onClick={() => navigate("sleep")}
										style={{
											marginLeft: "auto",
											fontSize: "12px",
											color: theme.primary,
											background: "none",
											border: "none",
											cursor: "pointer",
											fontWeight: "600",
										}}
									>
										{isToday
											? "기록하기"
											: "뒤늦게 기록하기"}{" "}
										→
									</button>
								)}
							</div>
						)}

						{/* 하루 돌아보기 */}
						{selDiary ? (
							<button
								onClick={() => navigate("dayDetail")}
								style={{
									...s.card,
									width: "100%",
									padding: "16px 20px",
									border: "none",
									cursor: "pointer",
									textAlign: "left",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										marginBottom: "8px",
									}}
								>
									<span style={{ fontSize: "24px" }}>
										{selDiary.mood}
									</span>
									<p
										style={{
											fontSize: "14px",
											fontWeight: "600",
										}}
									>
										하루 돌아보기
									</p>
									<span
										style={{
											marginLeft: "auto",
											fontSize: "11px",
											color: theme.primary,
										}}
									>
										상세 보기 →
									</span>
								</div>
								<p
									style={{
										fontSize: "13px",
										lineHeight: "1.6",
										color: theme.textSub,
										overflow: "hidden",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									}}
								>
									{selDiary.content
										.split("\n")
										.filter(
											(l) =>
												!l.startsWith(
													"[하루 돌아보기]",
												) &&
												!l.startsWith(
													"[데일리 체크인]",
												) &&
												!l.startsWith("[코멘트]") &&
												l.trim(),
										)
										.join(" ") || "기분 기록 완료"}
								</p>
							</button>
						) : selInProgress ? (
							<button
								onClick={() => navigate("routine")}
								style={{
									...s.card,
									width: "100%",
									padding: "16px 20px",
									border: `1.5px solid ${theme.yellow}80`,
									cursor: "pointer",
									textAlign: "left",
									background: theme.yellowLight,
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
									}}
								>
									<span style={{ fontSize: "20px" }}>💬</span>
									<div style={{ flex: 1 }}>
										<p
											style={{
												fontSize: "14px",
												fontWeight: "600",
												color: theme.text,
											}}
										>
											대화가 진행 중이에요
										</p>
										<p
											style={{
												fontSize: "12px",
												color: theme.textSub,
											}}
										>
											아까 이야기하던 곳에서 이어갈 수
											있어요
										</p>
									</div>
									<span
										style={{
											fontSize: "12px",
											color: theme.primary,
											fontWeight: "600",
											whiteSpace: "nowrap",
										}}
									>
										이어서 대화 →
									</span>
								</div>
							</button>
						) : (
							<div
								style={{
									...s.card,
									padding: "16px 20px",
									display: "flex",
									alignItems: "center",
									gap: "12px",
									color: theme.textLight,
								}}
							>
								<span style={{ fontSize: "20px" }}>
									{selSleepDone ? "💭" : "🔒"}
								</span>
								<p style={{ fontSize: "13px" }}>
									{selSleepDone
										? "하루 돌아보기가 없어요"
										: "수면 기록을 먼저 완료해주세요"}
								</p>
								{canRecord && selSleepDone && (
									<button
										onClick={() => navigate("routine")}
										style={{
											marginLeft: "auto",
											fontSize: "12px",
											color: theme.primary,
											background: "none",
											border: "none",
											cursor: "pointer",
											fontWeight: "600",
										}}
									>
										{isToday
											? "시작하기"
											: "뒤늦게 기록하기"}{" "}
										→
									</button>
								)}
								{canRecord && !selSleepDone && (
									<button
										onClick={() => navigate("sleep")}
										style={{
											marginLeft: "auto",
											fontSize: "12px",
											color: theme.accent,
											background: "none",
											border: "none",
											cursor: "pointer",
											fontWeight: "600",
										}}
									>
										수면 기록하기 →
									</button>
								)}
							</div>
						)}
					</>
				)}
			</div>

			{/* 빠른 접근 */}
			<div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
				<button
					onClick={() => navigate("chat")}
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						border: "none",
						cursor: "pointer",
						padding: "16px",
					}}
				>
					<span
						style={{
							fontSize: "22px",
							display: "block",
							marginBottom: "4px",
						}}
					>
						💬
					</span>
					<span style={{ fontSize: "12px", color: theme.textSub }}>
						자유 상담
					</span>
				</button>
				<button
					onClick={() => navigate("chatLogs")}
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						border: "none",
						cursor: "pointer",
						padding: "16px",
					}}
				>
					<span
						style={{
							fontSize: "22px",
							display: "block",
							marginBottom: "4px",
						}}
					>
						📋
					</span>
					<span style={{ fontSize: "12px", color: theme.textSub }}>
						상담 기록
					</span>
				</button>
				<button
					onClick={() => navigate("report")}
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						border: "none",
						cursor: "pointer",
						padding: "16px",
					}}
				>
					<span
						style={{
							fontSize: "22px",
							display: "block",
							marginBottom: "4px",
						}}
					>
						📊
					</span>
					<span style={{ fontSize: "12px", color: theme.textSub }}>
						리포트
					</span>
				</button>
			</div>
		</div>
	);
}

// ============================================================
// DAY DETAIL — 날짜별 기록 상세 (요약 + 대화 펼쳐보기 + 코멘트)
// ============================================================
function DayDetailPage({ user, token, navigate, targetDate }) {
	const [diary, setDiary] = useState(null);
	const [chatLogs, setChatLogs] = useState([]);
	const [showFullChat, setShowFullChat] = useState(false);
	const [comment, setComment] = useState("");
	const [savedComment, setSavedComment] = useState("");
	const [loading, setLoading] = useState(true);
	const isToday = targetDate === todayStr();
	const dateLabel = isToday ? "오늘" : fmtDate(targetDate);

	useEffect(() => {
		(async () => {
			try {
				const [diaries, logs] = await Promise.all([
					api("GET", "/diary/list", null, token),
					api("GET", "/chat/logs?limit=200", null, token),
				]);
				const d = diaries.find((x) => x.created_date === targetDate);
				if (d) setDiary(d);
				const dayLogs = logs
					.filter(
						(l) =>
							l.target_date === targetDate ||
							l.created_date?.startsWith(targetDate),
					)
					.reverse();
				setChatLogs(dayLogs);
				// 기존 코멘트 파싱
				if (d && d.content) {
					const m = d.content.match(/\[코멘트\]\s*(.*)/);
					if (m) setSavedComment(m[1]);
				}
			} catch (e) {}
			setLoading(false);
		})();
	}, []);

	const saveComment = async () => {
		if (!comment.trim()) return;
		const newComment = savedComment
			? `${savedComment} / ${comment.trim()}`
			: comment.trim();
		const newContent = diary.content.includes("[코멘트]")
			? diary.content.replace(/\[코멘트\].*$/, `[코멘트] ${newComment}`)
			: `${diary.content}\n[코멘트] ${newComment}`;
		try {
			await api(
				"POST",
				"/diary",
				{
					user_id: user?.user_id,
					mood: diary.mood,
					content: newContent,
					created_date: targetDate,
				},
				token,
			);
			setSavedComment(newComment);
			setComment("");
			alert("코멘트가 추가되었습니다!");
		} catch (e) {
			alert("저장 실패");
		}
	};

	if (loading)
		return (
			<div
				style={{
					...s.page,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
				}}
			>
				<p style={{ color: theme.textSub }}>불러오는 중...</p>
			</div>
		);

	return (
		<div style={{ ...s.page, paddingBottom: "100px" }}>
			<div style={s.topBar}>
				<button style={s.backBtn} onClick={() => navigate("home")}>
					{Icons.back}
				</button>
				<span style={s.topTitle}>💭 {dateLabel} 돌아보기</span>
				<div style={{ width: "30px" }} />
			</div>
			<div style={{ padding: "0 20px" }}>
				{!diary ? (
					<div
						style={{
							textAlign: "center",
							padding: "60px 20px",
							color: theme.textSub,
						}}
						className="fade-in-up"
					>
						<p style={{ fontSize: "40px", marginBottom: "12px" }}>
							💭
						</p>
						<p>이 날의 기록이 없어요</p>
						<button
							onClick={() => navigate("routine")}
							style={{ ...s.btnOutline, marginTop: "16px" }}
						>
							하루 돌아보기 시작
						</button>
					</div>
				) : (
					<div className="fade-in-up">
						{/* 기분 + 요약 카드 */}
						<div
							style={{
								...s.card,
								padding: "24px",
								background: `linear-gradient(135deg, ${theme.primaryLight}, #fff)`,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "12px",
									marginBottom: "12px",
								}}
							>
								<span style={{ fontSize: "36px" }}>
									{diary.mood}
								</span>
								<div>
									<p
										style={{
											fontSize: "16px",
											fontWeight: "700",
										}}
									>
										{dateLabel}
									</p>
									<p
										style={{
											fontSize: "12px",
											color: theme.textSub,
										}}
									>
										{new Date(
											targetDate + "T00:00:00",
										).toLocaleDateString("ko-KR", {
											weekday: "long",
										})}
									</p>
								</div>
							</div>
							{(() => {
								// 태그 라인과 코멘트를 제거하고 순수 요약만 추출
								const lines = diary.content
									.split("\n")
									.filter(
										(l) =>
											!l.startsWith("[하루 돌아보기]") &&
											!l.startsWith("[데일리 체크인]") &&
											!l.startsWith("[코멘트]") &&
											l.trim(),
									);
								return lines.length > 0 ? (
									<p
										style={{
											fontSize: "14px",
											lineHeight: "1.7",
											color: theme.text,
										}}
									>
										{lines.join("\n")}
									</p>
								) : (
									<p
										style={{
											fontSize: "13px",
											color: theme.textLight,
										}}
									>
										요약이 없어요
									</p>
								);
							})()}
						</div>

						{/* 코멘트 영역 */}
						<div style={{ ...s.card, padding: "16px 20px" }}>
							<p
								style={{
									fontSize: "14px",
									fontWeight: "600",
									marginBottom: "10px",
								}}
							>
								📝 코멘트
							</p>
							{savedComment && (
								<p
									style={{
										fontSize: "13px",
										lineHeight: "1.6",
										color: theme.textSub,
										marginBottom: "10px",
										padding: "10px 14px",
										background: theme.bg,
										borderRadius: theme.radiusSm,
									}}
								>
									{savedComment}
								</p>
							)}
							<div style={{ display: "flex", gap: "8px" }}>
								<input
									style={{
										...s.input,
										flex: 1,
										padding: "10px 14px",
										fontSize: "13px",
									}}
									placeholder="한 줄 코멘트 추가..."
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									onKeyDown={(e) =>
										e.key === "Enter" && saveComment()
									}
								/>
								<button
									onClick={saveComment}
									disabled={!comment.trim()}
									style={{
										padding: "10px 16px",
										borderRadius: theme.radiusSm,
										border: "none",
										background: comment.trim()
											? theme.primary
											: theme.border,
										color: "#fff",
										fontSize: "13px",
										fontWeight: "600",
										cursor: "pointer",
										whiteSpace: "nowrap",
									}}
								>
									추가
								</button>
							</div>
						</div>

						{/* 대화 내용 */}
						{chatLogs.length > 0 && (
							<div style={s.card}>
								<button
									onClick={() =>
										setShowFullChat(!showFullChat)
									}
									style={{
										width: "100%",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										background: "none",
										border: "none",
										cursor: "pointer",
										padding: "0",
									}}
								>
									<p
										style={{
											fontSize: "14px",
											fontWeight: "600",
										}}
									>
										💬 대화 내용 ({chatLogs.length}건)
									</p>
									<span
										style={{
											fontSize: "12px",
											color: theme.primary,
										}}
									>
										{showFullChat ? "접기 ▲" : "펼쳐보기 ▼"}
									</span>
								</button>
								{showFullChat && (
									<div
										style={{
											marginTop: "14px",
											display: "flex",
											flexDirection: "column",
											gap: "8px",
										}}
									>
										{chatLogs.map((log, i) => (
											<div
												key={i}
												style={{
													display: "flex",
													justifyContent:
														log.role === "user"
															? "flex-end"
															: "flex-start",
												}}
											>
												{log.role === "assistant" && (
													<div
														style={{
															width: "24px",
															height: "24px",
															borderRadius: "50%",
															background:
																theme.primaryLight,
															display: "flex",
															alignItems:
																"center",
															justifyContent:
																"center",
															fontSize: "12px",
															marginRight: "6px",
															flexShrink: 0,
															marginTop: "2px",
														}}
													>
														🌻
													</div>
												)}
												<div
													style={{
														maxWidth: "80%",
														padding: "10px 14px",
														borderRadius: "14px",
														background:
															log.role === "user"
																? theme.primary
																: theme.bg,
														color:
															log.role === "user"
																? "#fff"
																: theme.text,
														fontSize: "13px",
														lineHeight: "1.6",
														whiteSpace: "pre-line",
														borderBottomRightRadius:
															log.role === "user"
																? "4px"
																: "14px",
														borderBottomLeftRadius:
															log.role ===
															"assistant"
																? "4px"
																: "14px",
													}}
												>
													{log.message}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}

						{/* 다시 대화하기 */}
						<button
							onClick={() => navigate("routine")}
							style={{
								...s.card,
								width: "100%",
								textAlign: "center",
								border: "none",
								cursor: "pointer",
								padding: "16px",
								color: theme.primary,
								fontSize: "14px",
								fontWeight: "600",
							}}
						>
							💬 이 날에 대해 더 이야기하기
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

// ============================================================
// DAILY TALK — 하루 돌아보기 (채팅)
// ============================================================
function DailyTalkPage({ user, token, navigate, targetDate }) {
	const isToday = targetDate === todayStr();
	const nickname = user?.nickname || "사용자";
	const dateLabel = isToday ? "오늘" : fmtDate(targetDate);
	const hour = new Date().getHours();
	const sessionType = isToday ? (hour < 14 ? "morning" : "evening") : "past";

	// 캐릭터 정의
	const characters = {
		default: {
			icon: "🌻",
			name: "상담사",
			color: theme.primary,
			bgColor: theme.primaryLight,
			greeting: isToday
				? sessionType === "morning"
					? `${nickname}님, 좋은 아침이에요! ☀️`
					: `${nickname}님, 오늘 하루 수고했어요 🌙`
				: `${nickname}님, ${dateLabel}은 어떤 하루였어요? 🌤`,
		},
		dog: {
			icon: "🐶",
			name: "강아지",
			color: "#8D6E63",
			bgColor: "#FFF3E0",
			greeting: isToday
				? `(꼬리 살랑살랑) ${nickname} 주인님!! 왔다왔다! 오늘 하루 어땠어?! 🐾`
				: `(꼬리 흔들흔들) 주인님! ${dateLabel}은 뭐 했어?! 궁금해!! 🐾`,
		},
		cat: {
			icon: "🐱",
			name: "고양이",
			color: "#7E57C2",
			bgColor: "#F3E5F5",
			greeting: isToday
				? `(하품) ...${nickname}, 왔어? 뭐, 오늘 어땠는지 들어는 줄게. 궁금해서 묻는 건 아니야.`
				: `(귀를 쫑긋) ...${dateLabel}? 뭐, 어떤 하루였는데. 말해봐.`,
		},
		tree: {
			icon: "🌳",
			name: "나무",
			color: "#558B2F",
			bgColor: "#F1F8E9",
			greeting: isToday
				? `...${nickname}, 어서 와. (잎이 살랑이며) 오늘 하루는 어떤 바람이 불었니?`
				: `...${nickname}, 반갑구나. ${dateLabel}은... 어떤 하루였는지, 천천히 들려주렴.`,
		},
	};

	// 캐릭터 선택 — localStorage에 날짜별 저장
	const charKey = `mindcare_char_${targetDate}`;
	const [selectedChar, setSelectedChar] = useState(
		() => localStorage.getItem(charKey) || null,
	);
	const [showCharPicker, setShowCharPicker] = useState(false);
	const [isResuming, setIsResuming] = useState(false);
	const char = characters[selectedChar] || characters.default;
	const selectChar = (key) => {
		setSelectedChar(key);
		localStorage.setItem(charKey, key);
		setShowCharPicker(false);
	};

	// 날짜 기반 화제 생성
	const getDateTopic = (ds) => {
		const d = new Date(ds + "T00:00:00");
		const m = d.getMonth() + 1;
		const day = d.getDate();
		const special = {
			"1-1": "새해 첫날이네! 올해 목표 같은 거 세웠어?",
			"2-14": "발렌타인데이다! 달콤한 하루 보냈어?",
			"3-1": "삼일절이네! 쉬는 날은 뭐 하면서 보냈어?",
			"3-14": "화이트데이네! 맛있는 거 먹었어?",
			"4-1": "만우절이다! 오늘 장난 치거나 당한 거 있어?",
			"4-5": "식목일이네! 봄 날씨가 좋아지고 있지?",
			"5-5": "어린이날이다! 어릴 때 생각나는 거 있어?",
			"5-8": "어버이날이네! 부모님한테 연락했어?",
			"5-15": "스승의 날이네! 기억에 남는 선생님 있어?",
			"6-6": "현충일이네. 쉬는 날은 어떻게 보냈어?",
			"8-15": "광복절이네! 연휴는 잘 보내고 있어?",
			"10-3": "개천절이네! 가을 날씨가 좋아지고 있지?",
			"10-9": "한글날이다! 쉬는 날 뭐 했어?",
			"10-31": "할로윈이네! 뭔가 특별한 거 했어?",
			"12-25": "크리스마스다! 어떤 하루 보냈어?",
		};
		const key = `${m}-${day}`;
		if (special[key]) return special[key];
		if (m >= 3 && m <= 5) {
			const t = [
				"봄 날씨가 좋아지고 있는데, 산책이나 해봤어?",
				"요즘 벚꽃이 피고 있을 때인데, 꽃 구경 갔어?",
				"날씨가 따뜻해지니까 기분도 좋아지지 않아?",
			];
			return t[day % t.length];
		}
		if (m >= 6 && m <= 8) {
			const t = [
				"요즘 날씨가 많이 덥지? 더위 먹지 않게 조심해!",
				"여름이니까 시원한 거 먹었어? 아이스크림이라든가!",
				"장마철인데 비 오면 기분이 어때?",
			];
			return t[day % t.length];
		}
		if (m >= 9 && m <= 11) {
			const t = [
				"가을 날씨가 좋아지고 있네! 단풍 구경 같은 거 생각해봤어?",
				"요즘 날씨가 선선해졌는데, 이런 날씨 좋아해?",
				"가을이라 감성적인 기분이 드는 계절이지?",
			];
			return t[day % t.length];
		}
		const t = [
			"겨울이라 날씨가 춥지? 따뜻하게 지내고 있어?",
			"연말이 다가오는 느낌인데, 올해 어떤 한 해였어?",
			"추울 때는 따뜻한 음식이 최고지! 오늘 뭐 먹었어?",
		];
		return t[day % t.length];
	};

	const dateTopic = getDateTopic(targetDate);
	const initialMsg = char.greeting + "\n" + dateTopic;

	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [step, setStep] = useState(0);
	const [sessionDone, setSessionDone] = useState(false);
	const [dayMood, setDayMood] = useState(null);
	const [showMoodPicker, setShowMoodPicker] = useState(false);
	const [initLoading, setInitLoading] = useState(true);
	const [continueChat, setContinueChat] = useState(false);
	const [needSleep, setNeedSleep] = useState(false); // 수면 기록 미완료
	const bottomRef = useRef(null);
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	useEffect(() => {
		(async () => {
			try {
				// 수면 기록 체크
				const sleepLogs = await api("GET", "/sleep/logs", null, token);
				const hasSleep = sleepLogs.some((sl) => sl.date === targetDate);
				if (!hasSleep) {
					setNeedSleep(true);
					setInitLoading(false);
					return;
				}

				const logs = await api(
					"GET",
					"/chat/logs?limit=100",
					null,
					token,
				);
				const dayLogs = logs
					.filter(
						(l) =>
							l.target_date === targetDate ||
							l.created_date?.startsWith(targetDate),
					)
					.reverse();
				if (dayLogs.length > 0) {
					setMessages([
						{ role: "assistant", message: initialMsg },
						...dayLogs.map((l) => ({
							role: l.role,
							message: l.message,
						})),
					]);
					setStep(
						Math.min(
							dayLogs.filter((l) => l.role === "user").length,
							5,
						),
					);
					const diaries = await api(
						"GET",
						"/diary/list",
						null,
						token,
					);
					const d = diaries.find(
						(x) => x.created_date === targetDate,
					);
					if (
						d &&
						(d.content?.includes("[데일리 체크인]") ||
							d.content?.includes("[하루 돌아보기]"))
					) {
						setDayMood(d.mood);
						setSessionDone(true);
						setStep(6);
						if (!selectedChar) selectChar("default");
					} else {
						setIsResuming(true);
						if (!selectedChar) selectChar("default");
					}
				} else {
					setMessages([{ role: "assistant", message: initialMsg }]);
				}
			} catch (e) {
				setMessages([{ role: "assistant", message: initialMsg }]);
			}
			setInitLoading(false);
		})();
	}, []);

	const sendMessage = async () => {
		if (!input.trim() || loading || showMoodPicker) return;
		if (sessionDone && !continueChat) return;
		const msg = input.trim();
		setInput("");
		setMessages((p) => [...p, { role: "user", message: msg }]);
		setLoading(true);
		try {
			const chatMode = continueChat ? "free" : "routine";
			// 현재 세션의 사용자 메시지 수 계산 (지금 보내는 것 포함)
			const userMsgCount =
				messages.filter((m) => m.role === "user").length + 1;
			const data = await api(
				"POST",
				"/chat",
				{
					user_id: user?.user_id,
					message: msg,
					mode: chatMode,
					round: userMsgCount,
					target_date: targetDate,
					character: selectedChar || "default",
				},
				token,
			);
			if (!continueChat) {
				const np =
					data.progress != null
						? Math.max(step, data.progress)
						: step + 1;
				setStep(np);
				setMessages((p) => [
					...p,
					{ role: "assistant", message: data.reply },
				]);
				const canWrapUp = userMsgCount >= 3;
				if (canWrapUp && (data.wrap_up || np >= 5) && !showMoodPicker) {
					const q = `${dateLabel}을 이모지로 표현한다면\n어떤 기분에 가장 가까웠나요?`;
					setTimeout(() => {
						setStep(6);
						setMessages((p) => [
							...p,
							{ role: "assistant", message: q },
						]);
						setShowMoodPicker(true);
						setLoading(false);
					}, 1200);
					return;
				}
			} else {
				setMessages((p) => [
					...p,
					{ role: "assistant", message: data.reply },
				]);
			}
		} catch (e) {
			setMessages((p) => [
				...p,
				{
					role: "assistant",
					message: "죄송해요, 응답을 받지 못했어요.",
				},
			]);
		}
		setLoading(false);
	};

	const startContinueChat = () => {
		setContinueChat(true);
		setMessages((p) => [
			...p,
			{
				role: "assistant",
				message: `${dateLabel}에 대해 더 이야기하고 싶은 게 있어? 편하게 말해줘 😊`,
			},
		]);
	};

	const handleMood = async (emoji) => {
		if (dayMood) return; // 이미 선택됨 — 연타 방지
		setShowMoodPicker(false); // 즉시 이모지 버튼 숨김
		setDayMood(emoji);
		setMessages((p) => [...p, { role: "user", message: emoji }]);
		setLoading(true);
		const labels = {
			"😊": "좋은",
			"😐": "평범한",
			"😢": "힘든",
			"😞": "우울한",
			"😤": "답답한",
			"😰": "불안한",
			"😫": "지친",
			"🥰": "뿌듯한",
		};
		const closing = isToday
			? `${labels[emoji] || ""} 하루였군요.\n이야기 나눠줘서 고마워요. 내일 또 만나요 🙂`
			: `${labels[emoji] || ""} 하루였군요.\n${dateLabel}을 돌아봐줘서 고마워요 🙂`;
		let summary = "";
		try {
			const res = await api(
				"POST",
				"/chat/summarize",
				{
					user_id: user?.user_id,
					messages: messages.filter(
						(m) => m.role === "user" || m.role === "assistant",
					),
				},
				token,
			);
			summary = res.summary || "";
		} catch (e) {}
		const content = summary
			? `[하루 돌아보기] ${dateLabel}의 기분: ${emoji}\n\n${summary}`
			: `[하루 돌아보기] ${dateLabel}의 기분: ${emoji}`;
		api(
			"POST",
			"/diary",
			{
				user_id: user?.user_id,
				mood: emoji,
				content,
				created_date: targetDate,
			},
			token,
		).catch(() => {});
		setTimeout(() => {
			setMessages((p) => [...p, { role: "assistant", message: closing }]);
			setSessionDone(true);
			setStep(6);
			setLoading(false);
		}, 800);
	};

	if (initLoading)
		return (
			<div
				style={{
					...s.page,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
				}}
			>
				<p style={{ color: theme.textSub }}>불러오는 중...</p>
			</div>
		);

	if (needSleep)
		return (
			<div
				style={{
					...s.page,
					display: "flex",
					flexDirection: "column",
					height: "100vh",
				}}
			>
				<div
					style={{
						...s.topBar,
						background: theme.card,
						borderBottom: `1px solid ${theme.border}`,
					}}
				>
					<button style={s.backBtn} onClick={() => navigate("home")}>
						{Icons.back}
					</button>
					<span style={s.topTitle}>💭 하루 돌아보기</span>
					<div style={{ width: "30px" }} />
				</div>
				<div
					style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "40px 20px",
					}}
				>
					<div style={{ textAlign: "center" }} className="fade-in-up">
						<p style={{ fontSize: "48px", marginBottom: "16px" }}>
							🌙
						</p>
						<p
							style={{
								fontSize: "18px",
								fontWeight: "700",
								marginBottom: "8px",
							}}
						>
							수면 기록을 먼저 해주세요
						</p>
						<p
							style={{
								fontSize: "14px",
								color: theme.textSub,
								lineHeight: "1.6",
								marginBottom: "24px",
							}}
						>
							{dateLabel}의 수면 기록이 없어요.
							<br />
							하루 돌아보기 전에 수면을 먼저 기록해주세요.
						</p>
						<button
							onClick={() => navigate("sleep")}
							style={{
								...s.btnPrimary,
								width: "auto",
								padding: "14px 32px",
								background: theme.indigo,
							}}
						>
							🌙 수면 기록하러 가기
						</button>
					</div>
				</div>
			</div>
		);

	// 캐릭터 미선택 시 선택 화면
	if (!selectedChar && !sessionDone && !isResuming)
		return (
			<div
				style={{
					...s.page,
					display: "flex",
					flexDirection: "column",
					height: "100vh",
				}}
			>
				<div
					style={{
						...s.topBar,
						background: theme.card,
						borderBottom: `1px solid ${theme.border}`,
					}}
				>
					<button style={s.backBtn} onClick={() => navigate("home")}>
						{Icons.back}
					</button>
					<span style={s.topTitle}>💭 하루 돌아보기</span>
					<div style={{ width: "30px" }} />
				</div>
				<div
					style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "20px",
					}}
				>
					<div style={{ width: "100%" }} className="fade-in-up">
						<div
							style={{
								textAlign: "center",
								marginBottom: "28px",
							}}
						>
							<p
								style={{
									fontSize: "20px",
									fontWeight: "700",
									marginBottom: "8px",
								}}
							>
								오늘은 누구와 이야기할까요?
							</p>
							<p
								style={{
									fontSize: "14px",
									color: theme.textSub,
								}}
							>
								대화 상대를 골라주세요
							</p>
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "12px",
							}}
						>
							{Object.entries(characters).map(([key, c]) => (
								<button
									key={key}
									onClick={() => selectChar(key)}
									className="pop"
									style={{
										...s.card,
										textAlign: "center",
										border: `2px solid transparent`,
										cursor: "pointer",
										padding: "24px 16px",
										transition: "all 0.2s",
										background: c.bgColor,
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.borderColor =
											c.color;
										e.currentTarget.style.transform =
											"translateY(-4px)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.borderColor =
											"transparent";
										e.currentTarget.style.transform =
											"translateY(0)";
									}}
								>
									<span
										style={{
											fontSize: "40px",
											display: "block",
											marginBottom: "10px",
										}}
									>
										{c.icon}
									</span>
									<p
										style={{
											fontSize: "15px",
											fontWeight: "700",
											color: c.color,
											marginBottom: "4px",
										}}
									>
										{c.name}
									</p>
									<p
										style={{
											fontSize: "11px",
											color: theme.textSub,
										}}
									>
										{key === "default"
											? "따뜻한 상담 친구"
											: key === "dog"
												? "활기찬 반려견"
												: key === "cat"
													? "도도한 고양이"
													: "지혜로운 나무"}
									</p>
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		);

	// 입력란 표시 여부
	const showInput = (!sessionDone && !showMoodPicker) || continueChat;

	return (
		<div
			style={{
				...s.page,
				display: "flex",
				flexDirection: "column",
				height: "100vh",
			}}
		>
			<div
				style={{
					...s.topBar,
					background: theme.card,
					borderBottom: `1px solid ${theme.border}`,
				}}
			>
				<button style={s.backBtn} onClick={() => navigate("home")}>
					{Icons.back}
				</button>
				<div style={{ textAlign: "center" }}>
					<span style={s.topTitle}>
						{isToday ? "하루 돌아보기" : `${dateLabel} 돌아보기`}
					</span>
					<p
						style={{
							fontSize: "11px",
							color: theme.textSub,
							marginTop: "2px",
						}}
					>
						{new Date(targetDate + "T00:00:00").toLocaleDateString(
							"ko-KR",
							{ month: "long", day: "numeric", weekday: "short" },
						)}
					</p>
				</div>
				<button
					onClick={() => setShowCharPicker(true)}
					style={{
						width: "30px",
						height: "30px",
						borderRadius: "50%",
						background: char.bgColor,
						border: `1.5px solid ${char.color}40`,
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "16px",
					}}
				>
					{char.icon}
				</button>
			</div>

			{/* 캐릭터 교체 모달 */}
			{showCharPicker && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0,0,0,0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 100,
						padding: "20px",
					}}
					onClick={() => setShowCharPicker(false)}
				>
					<div
						className="pop"
						style={{
							background: theme.card,
							borderRadius: theme.radius,
							padding: "24px",
							maxWidth: "340px",
							width: "100%",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<p
							style={{
								fontSize: "16px",
								fontWeight: "700",
								textAlign: "center",
								marginBottom: "16px",
							}}
						>
							상담 친구 바꾸기
						</p>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "10px",
							}}
						>
							{Object.entries(characters).map(([key, c]) => (
								<button
									key={key}
									onClick={() => selectChar(key)}
									style={{
										padding: "16px 8px",
										borderRadius: theme.radiusSm,
										border: `2px solid ${selectedChar === key ? c.color : "transparent"}`,
										background: c.bgColor,
										cursor: "pointer",
										textAlign: "center",
									}}
								>
									<span
										style={{
											fontSize: "28px",
											display: "block",
											marginBottom: "4px",
										}}
									>
										{c.icon}
									</span>
									<p
										style={{
											fontSize: "13px",
											fontWeight: "600",
											color: c.color,
										}}
									>
										{c.name}
									</p>
								</button>
							))}
						</div>
						<button
							onClick={() => setShowCharPicker(false)}
							style={{
								...s.btnOutline,
								width: "100%",
								marginTop: "12px",
								borderColor: theme.textLight,
								color: theme.textSub,
							}}
						>
							닫기
						</button>
					</div>
				</div>
			)}
			<div style={{ padding: "8px 20px", display: "flex", gap: "4px" }}>
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						style={{
							flex: 1,
							height: "3px",
							borderRadius: "2px",
							background: i < step ? char.color : theme.border,
							transition: "background 0.5s ease",
						}}
					/>
				))}
			</div>
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "8px 16px 16px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				{messages.map((msg, i) => (
					<div
						key={i}
						className="fade-in"
						style={{
							display: "flex",
							justifyContent:
								msg.role === "user" ? "flex-end" : "flex-start",
						}}
					>
						{msg.role === "assistant" && (
							<div
								style={{
									width: "32px",
									height: "32px",
									borderRadius: "50%",
									background: char.bgColor,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "16px",
									marginRight: "8px",
									flexShrink: 0,
									marginTop: "4px",
								}}
							>
								{char.icon}
							</div>
						)}
						<div
							style={{
								maxWidth: "75%",
								padding: "14px 16px",
								borderRadius: "18px",
								background:
									msg.role === "user"
										? theme.primary
										: theme.card,
								color:
									msg.role === "user" ? "#fff" : theme.text,
								boxShadow:
									msg.role === "assistant"
										? theme.shadow
										: "none",
								borderBottomRightRadius:
									msg.role === "user" ? "4px" : "18px",
								borderBottomLeftRadius:
									msg.role === "assistant" ? "4px" : "18px",
								fontSize: "14px",
								lineHeight: "1.7",
								whiteSpace: "pre-line",
							}}
						>
							{msg.message}
						</div>
					</div>
				))}
				{loading && (
					<div
						className="fade-in"
						style={{ display: "flex", gap: "8px" }}
					>
						<div
							style={{
								width: "32px",
								height: "32px",
								borderRadius: "50%",
								background: char.bgColor,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "16px",
								flexShrink: 0,
							}}
						>
							{char.icon}
						</div>
						<div
							style={{
								...s.card,
								padding: "14px 20px",
								display: "flex",
								gap: "6px",
							}}
						>
							<span
								style={{
									width: "7px",
									height: "7px",
									borderRadius: "50%",
									background: theme.textLight,
									animation: "typing 1.4s infinite",
								}}
							/>
							<span
								style={{
									width: "7px",
									height: "7px",
									borderRadius: "50%",
									background: theme.textLight,
									animation: "typing 1.4s infinite",
									animationDelay: "0.2s",
								}}
							/>
							<span
								style={{
									width: "7px",
									height: "7px",
									borderRadius: "50%",
									background: theme.textLight,
									animation: "typing 1.4s infinite",
									animationDelay: "0.4s",
								}}
							/>
						</div>
					</div>
				)}
				{sessionDone && dayMood && !continueChat && (
					<div
						className="fade-in-up"
						style={{
							...s.card,
							background: `linear-gradient(135deg, ${theme.primaryLight}, #fff)`,
							textAlign: "center",
							padding: "24px",
							marginTop: "8px",
						}}
					>
						<p
							style={{
								fontSize: "13px",
								color: theme.textSub,
								marginBottom: "8px",
							}}
						>
							{dateLabel}의 기분
						</p>
						<p style={{ fontSize: "48px" }}>{dayMood}</p>
						<div
							style={{
								display: "flex",
								gap: "8px",
								justifyContent: "center",
								marginTop: "16px",
								flexWrap: "wrap",
							}}
						>
							<button
								onClick={startContinueChat}
								style={{
									...s.btnOutline,
									fontSize: "13px",
									padding: "10px 16px",
								}}
							>
								💬 더 이야기하기
							</button>
							<button
								onClick={() => navigate("dayDetail")}
								style={{
									...s.btnOutline,
									fontSize: "13px",
									padding: "10px 16px",
								}}
							>
								📝 상세 보기
							</button>
							<button
								onClick={() => navigate("home")}
								style={{
									...s.btnOutline,
									fontSize: "13px",
									padding: "10px 16px",
									borderColor: theme.accent,
									color: theme.accent,
								}}
							>
								🏠 홈으로
							</button>
						</div>
					</div>
				)}
				<div ref={bottomRef} />
			</div>
			{showInput && (
				<div
					style={{
						borderTop: `1px solid ${theme.border}`,
						background: theme.card,
					}}
				>
					{!loading && !continueChat && (
						<div
							style={{
								padding: "8px 16px 0",
								display: "flex",
								gap: "6px",
								flexWrap: "wrap",
							}}
						>
							<button
								onClick={() => {
									const msg = "다른 이야기 하고 싶어";
									setMessages((p) => [
										...p,
										{ role: "user", message: msg },
									]);
									setLoading(true);
									const userMsgCount =
										messages.filter(
											(m) => m.role === "user",
										).length + 1;
									api(
										"POST",
										"/chat",
										{
											user_id: user?.user_id,
											message: msg,
											mode: "routine",
											round: userMsgCount,
											target_date: targetDate,
											character:
												selectedChar || "default",
										},
										token,
									)
										.then((data) => {
											const np =
												data.progress != null
													? Math.max(
															step,
															data.progress,
														)
													: step + 1;
											setStep(np);
											setMessages((p) => [
												...p,
												{
													role: "assistant",
													message: data.reply,
												},
											]);
											setLoading(false);
										})
										.catch(() => {
											setMessages((p) => [
												...p,
												{
													role: "assistant",
													message:
														"그래! 어떤 이야기 하고 싶어?",
												},
											]);
											setLoading(false);
										});
								}}
								style={{
									padding: "6px 14px",
									borderRadius: "20px",
									border: `1.5px solid ${theme.primary}`,
									background: theme.primaryLight,
									fontSize: "12px",
									color: theme.primaryDark,
									cursor: "pointer",
									fontWeight: "500",
								}}
							>
								🔄 주제 바꾸기
							</button>
							<button
								onClick={() => {
									const msg = "오늘 기분이 별로야";
									setMessages((p) => [
										...p,
										{ role: "user", message: msg },
									]);
									setLoading(true);
									const userMsgCount =
										messages.filter(
											(m) => m.role === "user",
										).length + 1;
									api(
										"POST",
										"/chat",
										{
											user_id: user?.user_id,
											message: msg,
											mode: "routine",
											round: userMsgCount,
											target_date: targetDate,
											character:
												selectedChar || "default",
										},
										token,
									)
										.then((data) => {
											const np =
												data.progress != null
													? Math.max(
															step,
															data.progress,
														)
													: step + 1;
											setStep(np);
											setMessages((p) => [
												...p,
												{
													role: "assistant",
													message: data.reply,
												},
											]);
											setLoading(false);
										})
										.catch(() => {
											setMessages((p) => [
												...p,
												{
													role: "assistant",
													message:
														"그렇구나... 어떤 일이 있었어?",
												},
											]);
											setLoading(false);
										});
								}}
								style={{
									padding: "6px 14px",
									borderRadius: "20px",
									border: `1.5px solid ${theme.purple}`,
									background: theme.purpleLight,
									fontSize: "12px",
									color: theme.purple,
									cursor: "pointer",
									fontWeight: "500",
								}}
							>
								😔 기분이 별로야
							</button>
							<button
								onClick={() => {
									const msg = "나 할 말이 있어";
									setMessages((p) => [
										...p,
										{ role: "user", message: msg },
									]);
									setLoading(true);
									const userMsgCount =
										messages.filter(
											(m) => m.role === "user",
										).length + 1;
									api(
										"POST",
										"/chat",
										{
											user_id: user?.user_id,
											message: msg,
											mode: "routine",
											round: userMsgCount,
											target_date: targetDate,
											character:
												selectedChar || "default",
										},
										token,
									)
										.then((data) => {
											const np =
												data.progress != null
													? Math.max(
															step,
															data.progress,
														)
													: step + 1;
											setStep(np);
											setMessages((p) => [
												...p,
												{
													role: "assistant",
													message: data.reply,
												},
											]);
											setLoading(false);
										})
										.catch(() => {
											setMessages((p) => [
												...p,
												{
													role: "assistant",
													message:
														"응, 들을게! 말해봐!",
												},
											]);
											setLoading(false);
										});
								}}
								style={{
									padding: "6px 14px",
									borderRadius: "20px",
									border: `1.5px solid ${theme.blue}`,
									background: theme.blueLight,
									fontSize: "12px",
									color: theme.blue,
									cursor: "pointer",
									fontWeight: "500",
								}}
							>
								💬 할 말 있어
							</button>
						</div>
					)}
					<div
						style={{
							padding: "12px 16px 28px",
							display: "flex",
							gap: "10px",
							alignItems: "flex-end",
						}}
					>
						<textarea
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder={
								continueChat
									? "더 이야기하고 싶은 게 있으면 말해주세요..."
									: "이야기를 들려주세요..."
							}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									sendMessage();
								}
							}}
							style={{
								...s.input,
								resize: "none",
								minHeight: "44px",
								maxHeight: "120px",
								flex: 1,
								padding: "12px 14px",
							}}
							rows={1}
						/>
						<button
							onClick={sendMessage}
							disabled={loading || !input.trim()}
							style={{
								width: "44px",
								height: "44px",
								borderRadius: "50%",
								border: "none",
								background: input.trim()
									? theme.primary
									: theme.border,
								color: "#fff",
								fontSize: "18px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							{Icons.send}
						</button>
					</div>
				</div>
			)}
			{!sessionDone && showMoodPicker && (
				<div
					style={{
						padding: "12px 16px 28px",
						background: theme.card,
						borderTop: `1px solid ${theme.border}`,
					}}
				>
					<p
						style={{
							textAlign: "center",
							fontSize: "13px",
							color: theme.textSub,
							marginBottom: "8px",
						}}
					>
						오늘의 기분을 골라주세요
					</p>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(4, 1fr)",
							gap: "6px",
							padding: "4px 0",
						}}
					>
						{moods.map((m) => (
							<button
								key={m.emoji}
								onClick={() => handleMood(m.emoji)}
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "3px",
									background: "none",
									border: "2px solid transparent",
									borderRadius: "14px",
									padding: "8px 4px",
									cursor: "pointer",
									fontSize: "26px",
									transition: "all 0.2s",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor =
										theme.primary;
									e.currentTarget.style.background =
										theme.primaryLight;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor =
										"transparent";
									e.currentTarget.style.background = "none";
								}}
							>
								<span>{m.emoji}</span>
								<span
									style={{
										fontSize: "10px",
										color: theme.textSub,
									}}
								>
									{m.label}
								</span>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================================
// FREE CHAT
// ============================================================
function ChatPage({ user, token, navigate }) {
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			message:
				"안녕하세요! 편하게 이야기해 주세요 😊\n무엇이든 들을 준비가 되어 있어요.",
		},
	]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const bottomRef = useRef(null);
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);
	const send = async () => {
		if (!input.trim() || loading) return;
		const msg = input.trim();
		setInput("");
		setMessages((p) => [...p, { role: "user", message: msg }]);
		setLoading(true);
		try {
			const d = await api(
				"POST",
				"/chat",
				{ user_id: user?.user_id, message: msg, mode: "free" },
				token,
			);
			setMessages((p) => [...p, { role: "assistant", message: d.reply }]);
		} catch (e) {
			setMessages((p) => [
				...p,
				{
					role: "assistant",
					message: "죄송해요, 응답을 받지 못했어요.",
				},
			]);
		}
		setLoading(false);
	};
	return (
		<div
			style={{
				...s.page,
				display: "flex",
				flexDirection: "column",
				height: "100vh",
			}}
		>
			<div style={s.topBar}>
				<button style={s.backBtn} onClick={() => navigate("home")}>
					{Icons.back}
				</button>
				<span style={s.topTitle}>💬 자유 상담</span>
				<div style={{ width: "30px" }} />
			</div>
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "0 16px 16px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				{messages.map((m, i) => (
					<div
						key={i}
						className="fade-in"
						style={{
							display: "flex",
							justifyContent:
								m.role === "user" ? "flex-end" : "flex-start",
						}}
					>
						<div
							style={{
								maxWidth: "80%",
								padding: "14px 16px",
								borderRadius: "18px",
								background:
									m.role === "user"
										? theme.primary
										: theme.card,
								color: m.role === "user" ? "#fff" : theme.text,
								boxShadow:
									m.role === "assistant"
										? theme.shadow
										: "none",
								borderBottomRightRadius:
									m.role === "user" ? "4px" : "18px",
								borderBottomLeftRadius:
									m.role === "assistant" ? "4px" : "18px",
								fontSize: "14px",
								lineHeight: "1.6",
								whiteSpace: "pre-line",
							}}
						>
							{m.message}
						</div>
					</div>
				))}
				{loading && (
					<div
						className="fade-in"
						style={{
							display: "flex",
							justifyContent: "flex-start",
						}}
					>
						<div
							style={{
								...s.card,
								padding: "14px 20px",
								fontSize: "14px",
								color: theme.textSub,
							}}
						>
							생각하는 중...
						</div>
					</div>
				)}
				<div ref={bottomRef} />
			</div>
			<div
				style={{
					padding: "12px 16px 28px",
					background: theme.card,
					borderTop: `1px solid ${theme.border}`,
					display: "flex",
					gap: "10px",
					alignItems: "flex-end",
				}}
			>
				<textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="이야기를 들려주세요..."
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							send();
						}
					}}
					style={{
						...s.input,
						resize: "none",
						minHeight: "44px",
						maxHeight: "120px",
						flex: 1,
						padding: "12px 14px",
					}}
					rows={1}
				/>
				<button
					onClick={send}
					disabled={loading || !input.trim()}
					style={{
						width: "44px",
						height: "44px",
						borderRadius: "50%",
						border: "none",
						background: input.trim() ? theme.primary : theme.border,
						color: "#fff",
						fontSize: "18px",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					{Icons.send}
				</button>
			</div>
		</div>
	);
}

// ============================================================
// CHAT LOGS
// ============================================================
function ChatLogsPage({ token, navigate }) {
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [expandedDate, setExpandedDate] = useState(null);
	useEffect(() => {
		(async () => {
			try {
				setLogs(await api("GET", "/chat/logs?limit=200", null, token));
			} catch (e) {}
			setLoading(false);
		})();
	}, []);

	// 날짜별 그룹핑
	const grouped = {};
	logs.forEach((l) => {
		const d = l.target_date || l.created_date?.slice(0, 10) || "unknown";
		if (!grouped[d]) grouped[d] = [];
		grouped[d].push(l);
	});
	// 날짜 역순 정렬, 각 그룹 내부는 시간순으로 뒤집기
	const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

	return (
		<div style={{ ...s.page, paddingBottom: "100px" }}>
			<div style={s.topBar}>
				<button style={s.backBtn} onClick={() => navigate("home")}>
					{Icons.back}
				</button>
				<span style={s.topTitle}>상담 기록</span>
				<div style={{ width: "30px" }} />
			</div>
			<div style={{ padding: "0 20px" }}>
				{loading ? (
					<div
						style={{
							textAlign: "center",
							padding: "40px",
							color: theme.textSub,
						}}
					>
						불러오는 중...
					</div>
				) : dates.length === 0 ? (
					<div
						style={{
							textAlign: "center",
							padding: "40px",
							color: theme.textSub,
						}}
					>
						<p style={{ fontSize: "40px", marginBottom: "12px" }}>
							💬
						</p>
						<p>아직 상담 기록이 없어요</p>
					</div>
				) : (
					dates.map((date) => {
						const dayLogs = grouped[date].reverse();
						const userMsgs = dayLogs.filter(
							(l) => l.role === "user",
						);
						const isExpanded = expandedDate === date;
						const preview = userMsgs[0]?.message || "대화 기록";
						return (
							<div
								key={date}
								className="fade-in-up"
								style={{
									...s.card,
									padding: "0",
									overflow: "hidden",
								}}
							>
								<button
									onClick={() =>
										setExpandedDate(
											isExpanded ? null : date,
										)
									}
									style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										gap: "12px",
										padding: "16px 20px",
										background: "none",
										border: "none",
										cursor: "pointer",
										textAlign: "left",
									}}
								>
									<div
										style={{
											width: "36px",
											height: "36px",
											borderRadius: "50%",
											background: theme.primaryLight,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "16px",
											flexShrink: 0,
										}}
									>
										💬
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												marginBottom: "4px",
											}}
										>
											<p
												style={{
													fontSize: "14px",
													fontWeight: "600",
												}}
											>
												{fmtDate(date)}
											</p>
											<span
												style={{
													fontSize: "11px",
													color: theme.textLight,
												}}
											>
												{dayLogs.length}건
											</span>
										</div>
										<p
											style={{
												fontSize: "13px",
												color: theme.textSub,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{preview}
										</p>
									</div>
									<span
										style={{
											fontSize: "12px",
											color: theme.primary,
											flexShrink: 0,
										}}
									>
										{isExpanded ? "▲" : "▼"}
									</span>
								</button>
								{isExpanded && (
									<div
										style={{
											padding: "0 16px 16px",
											display: "flex",
											flexDirection: "column",
											gap: "6px",
											borderTop: `1px solid ${theme.border}`,
										}}
									>
										<div style={{ height: "8px" }} />
										{dayLogs.map((l, i) => (
											<div
												key={i}
												style={{
													display: "flex",
													justifyContent:
														l.role === "user"
															? "flex-end"
															: "flex-start",
												}}
											>
												{l.role === "assistant" && (
													<div
														style={{
															width: "24px",
															height: "24px",
															borderRadius: "50%",
															background:
																theme.primaryLight,
															display: "flex",
															alignItems:
																"center",
															justifyContent:
																"center",
															fontSize: "11px",
															marginRight: "6px",
															flexShrink: 0,
															marginTop: "2px",
														}}
													>
														🌻
													</div>
												)}
												<div
													style={{
														maxWidth: "80%",
														padding: "10px 14px",
														borderRadius: "14px",
														background:
															l.role === "user"
																? theme.primary
																: theme.bg,
														color:
															l.role === "user"
																? "#fff"
																: theme.text,
														fontSize: "13px",
														lineHeight: "1.5",
														whiteSpace: "pre-line",
														borderBottomRightRadius:
															l.role === "user"
																? "4px"
																: "14px",
														borderBottomLeftRadius:
															l.role ===
															"assistant"
																? "4px"
																: "14px",
													}}
												>
													{l.message}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

// ============================================================
// SLEEP
// ============================================================
function SleepPage({ user, token, navigate, targetDate }) {
	const [tab, setTab] = useState("record");
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saved, setSaved] = useState(false); // 저장 완료 상태
	useEffect(() => {
		(async () => {
			try {
				setLogs(await api("GET", "/sleep/logs", null, token));
			} catch (e) {}
			setLoading(false);
		})();
	}, []);
	const isToday = targetDate === todayStr();
	const dateLabel = isToday ? "오늘" : fmtDate(targetDate);
	const tabStyle = (a) => ({
		flex: 1,
		padding: "10px",
		border: "none",
		borderBottom: `2px solid ${a ? theme.indigo : "transparent"}`,
		background: "none",
		color: a ? theme.indigo : theme.textSub,
		fontWeight: a ? "600" : "400",
		fontSize: "14px",
		cursor: "pointer",
	});
	const existing = logs.find((l) => l.date === targetDate);

	// 저장 완료 → 하루 돌아보기 전환 화면
	if (saved)
		return (
			<div
				style={{
					...s.page,
					display: "flex",
					flexDirection: "column",
					height: "100vh",
					background: `linear-gradient(180deg, #FFF9F0 0%, #E8F5E9 100%)`,
				}}
			>
				<div style={s.topBar}>
					<button style={s.backBtn} onClick={() => navigate("home")}>
						{Icons.back}
					</button>
					<span style={s.topTitle}>🌙 수면 기록 완료</span>
					<div style={{ width: "30px" }} />
				</div>
				<div
					style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "40px 20px",
					}}
				>
					<div style={{ textAlign: "center" }} className="fade-in-up">
						<p
							className="float"
							style={{ fontSize: "56px", marginBottom: "16px" }}
						>
							🎉
						</p>
						<p
							style={{
								fontSize: "20px",
								fontWeight: "700",
								marginBottom: "8px",
								color: theme.accent,
							}}
						>
							{dateLabel} 수면 기록 완료!
						</p>
						<p
							style={{
								fontSize: "14px",
								color: theme.textSub,
								lineHeight: "1.6",
								marginBottom: "28px",
							}}
						>
							잘했어요! 이제 {dateLabel}의 하루를 돌아볼까요?
						</p>
						<button
							onClick={() => navigate("routine")}
							style={{
								...s.btnPrimary,
								width: "auto",
								padding: "16px 32px",
								marginBottom: "12px",
							}}
						>
							💭 하루 돌아보기 시작
						</button>
						<br />
						<button
							onClick={() => navigate("home")}
							style={{
								...s.btnOutline,
								marginTop: "8px",
								borderColor: theme.textLight,
								color: theme.textSub,
							}}
						>
							나중에 할게요
						</button>
					</div>
				</div>
			</div>
		);

	return (
		<div style={{ ...s.page, paddingBottom: "100px" }}>
			<div style={s.topBar}>
				<button style={s.backBtn} onClick={() => navigate("home")}>
					{Icons.back}
				</button>
				<span style={s.topTitle}>🌙 수면 관리</span>
				<div style={{ width: "30px" }} />
			</div>
			<div
				style={{
					display: "flex",
					borderBottom: `1px solid ${theme.border}`,
					margin: "0 20px",
				}}
			>
				<button
					style={tabStyle(tab === "record")}
					onClick={() => setTab("record")}
				>
					{dateLabel} {existing ? "수정" : "기록"}
				</button>
				<button
					style={tabStyle(tab === "history")}
					onClick={() => setTab("history")}
				>
					전체 기록
				</button>
			</div>
			<div style={{ padding: "16px 20px" }}>
				{tab === "record" ? (
					<SleepRecord
						user={user}
						token={token}
						targetDate={targetDate}
						existing={existing}
						onSaved={() => setSaved(true)}
					/>
				) : (
					<SleepHistory logs={logs} loading={loading} />
				)}
			</div>
		</div>
	);
}

function SleepRecord({ user, token, targetDate, existing, onSaved }) {
	const [bedtime, setBedtime] = useState("23:30");
	const [wakeup, setWakeup] = useState("07:00");
	const [issues, setIssues] = useState([]);
	const [loading, setLoading] = useState(false);

	// existing이 나중에 들어와도 반영
	useEffect(() => {
		if (existing) {
			setBedtime(existing.bedtime || "23:30");
			setWakeup(existing.wakeup || "07:00");
			setIssues(existing.issues || []);
		}
	}, [existing]);
	const isToday = targetDate === todayStr();
	const dateLabel = isToday ? "오늘" : fmtDate(targetDate);
	const issueOpts = [
		"잠들기 어려웠음",
		"자다가 깼음",
		"깊은 잠을 못 잤음",
		"악몽을 꿨음",
		"너무 일찍 깼음",
		"너무 늦게 잠들었음",
	];
	const toggle = (issue) =>
		setIssues((p) =>
			p.includes(issue) ? p.filter((i) => i !== issue) : [...p, issue],
		);
	const calc = () => {
		const [bh, bm] = bedtime.split(":").map(Number);
		const [wh, wm] = wakeup.split(":").map(Number);
		let b = bh * 60 + bm,
			w = wh * 60 + wm;
		if (w <= b) w += 1440;
		return ((w - b) / 60).toFixed(1);
	};
	const hours = parseFloat(calc());
	const isNormal = hours >= 7 && hours <= 9;
	const save = async () => {
		setLoading(true);
		try {
			await api(
				"POST",
				"/sleep",
				{
					user_id: user?.user_id,
					bedtime,
					wakeup,
					hours,
					quality:
						issues.length === 0
							? "good"
							: issues.length <= 1
								? "fair"
								: "poor",
					issues,
					date: targetDate,
				},
				token,
			);
			onSaved();
		} catch (e) {
			alert("저장 실패");
		}
		setLoading(false);
	};
	return (
		<div className="fade-in-up">
			{!isToday && (
				<div
					style={{
						...s.card,
						background: theme.accentLight,
						padding: "12px 16px",
						marginBottom: "4px",
					}}
				>
					<p style={{ fontSize: "13px", color: theme.accent }}>
						📝 {dateLabel}의 수면을 {existing ? "수정" : "기록"}하고
						있어요
					</p>
				</div>
			)}
			{existing && isToday && (
				<div
					style={{
						...s.card,
						background: theme.blueLight,
						padding: "12px 16px",
						marginBottom: "4px",
					}}
				>
					<p style={{ fontSize: "13px", color: theme.blue }}>
						✏️ 기존 기록을 수정하고 있어요
					</p>
				</div>
			)}
			<div
				style={{
					...s.card,
					textAlign: "center",
					background: `linear-gradient(135deg, ${theme.indigoLight}, #fff)`,
					padding: "24px",
				}}
			>
				<p
					style={{
						fontSize: "13px",
						color: theme.textSub,
						marginBottom: "4px",
					}}
				>
					예상 수면 시간
				</p>
				<p
					style={{
						fontSize: "36px",
						fontWeight: "700",
						color: theme.indigo,
					}}
				>
					{hours}
					<span style={{ fontSize: "16px", fontWeight: "400" }}>
						시간
					</span>
				</p>
				<p
					style={{
						fontSize: "13px",
						color: isNormal ? theme.primary : theme.accent,
						fontWeight: "500",
						marginTop: "4px",
					}}
				>
					{isNormal
						? "적정 수면 시간이에요 👍"
						: hours < 7
							? "수면 시간이 부족해요"
							: "수면 시간이 많은 편이에요"}
				</p>
			</div>
			<div style={s.card}>
				<p
					style={{
						fontSize: "14px",
						fontWeight: "600",
						marginBottom: "16px",
					}}
				>
					취침 · 기상 시간
				</p>
				<div style={{ display: "flex", gap: "16px" }}>
					<div style={{ flex: 1 }}>
						<label style={s.label}>🌙 취침</label>
						<input
							type="time"
							value={bedtime}
							onChange={(e) => setBedtime(e.target.value)}
							style={{
								...s.input,
								textAlign: "center",
								fontSize: "18px",
								fontWeight: "600",
							}}
						/>
					</div>
					<div style={{ flex: 1 }}>
						<label style={s.label}>☀️ 기상</label>
						<input
							type="time"
							value={wakeup}
							onChange={(e) => setWakeup(e.target.value)}
							style={{
								...s.input,
								textAlign: "center",
								fontSize: "18px",
								fontWeight: "600",
							}}
						/>
					</div>
				</div>
			</div>
			<div style={s.card}>
				<p
					style={{
						fontSize: "14px",
						fontWeight: "600",
						marginBottom: "6px",
					}}
				>
					수면에 불편한 점이 있었나요?
				</p>
				<p
					style={{
						fontSize: "12px",
						color: theme.textSub,
						marginBottom: "14px",
					}}
				>
					해당 항목을 모두 선택
				</p>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
					{issueOpts.map((issue) => {
						const sel = issues.includes(issue);
						return (
							<button
								key={issue}
								onClick={() => toggle(issue)}
								style={{
									padding: "8px 14px",
									borderRadius: "20px",
									border: `1.5px solid ${sel ? theme.indigo : theme.border}`,
									background: sel
										? theme.indigoLight
										: theme.card,
									color: sel ? theme.indigo : theme.textSub,
									fontSize: "13px",
									fontWeight: sel ? "600" : "400",
									cursor: "pointer",
								}}
							>
								{issue}
							</button>
						);
					})}
				</div>
			</div>
			<button
				style={{
					...s.btnPrimary,
					background: theme.indigo,
					marginTop: "8px",
					opacity: loading ? 0.7 : 1,
				}}
				onClick={save}
				disabled={loading}
			>
				{loading
					? "저장 중..."
					: existing
						? "수면 기록 수정"
						: "수면 기록 저장"}
			</button>
		</div>
	);
}

function SleepHistory({ logs, loading }) {
	if (loading)
		return (
			<div
				style={{
					textAlign: "center",
					padding: "40px",
					color: theme.textSub,
				}}
			>
				불러오는 중...
			</div>
		);
	if (!logs.length)
		return (
			<div
				style={{
					textAlign: "center",
					padding: "60px",
					color: theme.textSub,
				}}
				className="fade-in-up"
			>
				<p style={{ fontSize: "48px", marginBottom: "16px" }}>🌙</p>
				<p>아직 수면 기록이 없어요</p>
			</div>
		);
	const qE = (q) => (q === "good" ? "😴" : q === "fair" ? "😐" : "😵");
	const qL = (q) =>
		q === "good" ? "좋음" : q === "fair" ? "보통" : "개선 필요";
	const qC = (q) =>
		q === "good"
			? theme.primary
			: q === "fair"
				? theme.accent
				: theme.danger;
	const avg = (logs.reduce((s, l) => s + l.hours, 0) / logs.length).toFixed(
		1,
	);
	const good = logs.filter((l) => l.quality === "good").length;
	return (
		<div className="fade-in-up">
			<div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
				<div
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						padding: "16px",
					}}
				>
					<p
						style={{
							fontSize: "12px",
							color: theme.textSub,
							marginBottom: "4px",
						}}
					>
						평균 수면
					</p>
					<p
						style={{
							fontSize: "22px",
							fontWeight: "700",
							color: theme.indigo,
						}}
					>
						{avg}h
					</p>
				</div>
				<div
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						padding: "16px",
					}}
				>
					<p
						style={{
							fontSize: "12px",
							color: theme.textSub,
							marginBottom: "4px",
						}}
					>
						좋은 수면
					</p>
					<p
						style={{
							fontSize: "22px",
							fontWeight: "700",
							color: theme.primary,
						}}
					>
						{good}/{logs.length}일
					</p>
				</div>
			</div>
			<div style={{ ...s.card, padding: "20px" }}>
				<p
					style={{
						fontSize: "13px",
						fontWeight: "600",
						color: theme.textSub,
						marginBottom: "16px",
					}}
				>
					수면 시간 추이
				</p>
				{(() => {
					const reversed = [...logs].reverse();
					const maxH = Math.max(...reversed.map((l) => l.hours), 9);
					return (
						<div
							style={{
								display: "flex",
								alignItems: "flex-end",
								gap: "6px",
								height: "140px",
								paddingTop: "20px",
							}}
						>
							{reversed.map((l, i) => (
								<div
									key={i}
									style={{
										flex: 1,
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: "2px",
										minWidth: 0,
									}}
								>
									<span
										style={{
											fontSize: "10px",
											fontWeight: "600",
											color: theme.indigo,
											lineHeight: "1",
										}}
									>
										{l.hours}
									</span>
									<div
										style={{
											width: "100%",
											maxWidth: "32px",
											background:
												l.hours >= 7 && l.hours <= 9
													? theme.indigo
													: theme.accent,
											borderRadius: "4px 4px 0 0",
											height: `${Math.max((l.hours / maxH) * 90, 4)}px`,
											opacity: 0.7,
										}}
									/>
									<span
										style={{
											fontSize: "9px",
											color: theme.textLight,
											whiteSpace: "nowrap",
										}}
									>
										{l.date.slice(8)}일
									</span>
								</div>
							))}
						</div>
					);
				})()}
			</div>
			{logs.map((l, i) => (
				<div
					key={i}
					className="fade-in-up"
					style={{ ...s.card, animationDelay: `${i * 0.05}s` }}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: l.issues?.length ? "10px" : "0",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
							}}
						>
							<span style={{ fontSize: "24px" }}>
								{qE(l.quality)}
							</span>
							<div>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "600",
									}}
								>
									{l.date}
								</p>
								<p
									style={{
										fontSize: "12px",
										color: theme.textSub,
									}}
								>
									{l.bedtime}~{l.wakeup}
								</p>
							</div>
						</div>
						<div style={{ textAlign: "right" }}>
							<p
								style={{
									fontSize: "16px",
									fontWeight: "700",
									color: theme.indigo,
								}}
							>
								{l.hours}h
							</p>
							<p
								style={{
									fontSize: "11px",
									color: qC(l.quality),
									fontWeight: "500",
								}}
							>
								{qL(l.quality)}
							</p>
						</div>
					</div>
					{l.issues?.length > 0 && (
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "4px",
							}}
						>
							{l.issues.map((is, j) => (
								<span
									key={j}
									style={{
										fontSize: "11px",
										background: theme.indigoLight,
										color: theme.indigo,
										padding: "3px 10px",
										borderRadius: "10px",
									}}
								>
									{is}
								</span>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

// ============================================================
// REPORT
// ============================================================
function ReportPage({ token, navigate }) {
	const [tab, setTab] = useState("weekly");
	const [daily, setDaily] = useState([]);
	const [weekly, setWeekly] = useState(null);
	const [dep, setDep] = useState(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		(async () => {
			try {
				const [d, w, dp] = await Promise.all([
					api("GET", "/report/daily", null, token),
					api("GET", "/report/weekly", null, token),
					api("GET", "/report/depression", null, token),
				]);
				setDaily(d);
				setWeekly(w);
				setDep(dp);
			} catch (e) {}
			setLoading(false);
		})();
	}, []);
	const ts = (a) => ({
		flex: 1,
		padding: "10px",
		border: "none",
		borderBottom: `2px solid ${a ? theme.primary : "transparent"}`,
		background: "none",
		color: a ? theme.primary : theme.textSub,
		fontWeight: a ? "600" : "400",
		fontSize: "14px",
		cursor: "pointer",
	});
	return (
		<div style={{ ...s.page, paddingBottom: "100px" }}>
			<div style={s.topBar}>
				<div style={{ width: "30px" }} />
				<span style={s.topTitle}>📊 마음 리포트</span>
				<div style={{ width: "30px" }} />
			</div>
			<div
				style={{
					display: "flex",
					borderBottom: `1px solid ${theme.border}`,
					margin: "0 20px",
				}}
			>
				<button
					style={ts(tab === "weekly")}
					onClick={() => setTab("weekly")}
				>
					주간
				</button>
				<button
					style={ts(tab === "daily")}
					onClick={() => setTab("daily")}
				>
					일별
				</button>
				<button
					style={ts(tab === "depression")}
					onClick={() => setTab("depression")}
				>
					종합
				</button>
			</div>
			<div style={{ padding: "16px 20px" }}>
				{loading ? (
					<div
						style={{
							textAlign: "center",
							padding: "40px",
							color: theme.textSub,
						}}
					>
						분석 중...
					</div>
				) : tab === "weekly" && weekly ? (
					<div className="fade-in-up">
						<div
							style={{
								...s.card,
								textAlign: "center",
								padding: "24px",
								background: `linear-gradient(135deg, ${theme.blueLight}, #fff)`,
							}}
						>
							<p
								style={{
									fontSize: "13px",
									color: theme.textSub,
									marginBottom: "4px",
								}}
							>
								{weekly.period}
							</p>
							<p
								style={{
									fontSize: "15px",
									fontWeight: "600",
									color: theme.blue,
								}}
							>
								이번 주 기분 요약
							</p>
						</div>
						{Object.keys(weekly.mood_distribution || {}).length >
							0 && (
							<div style={s.card}>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "600",
										marginBottom: "14px",
									}}
								>
									기분 분포
								</p>
								<div
									style={{
										display: "flex",
										justifyContent: "space-around",
									}}
								>
									{Object.entries(
										weekly.mood_distribution,
									).map(([e, c]) => (
										<div
											key={e}
											style={{ textAlign: "center" }}
										>
											<span style={{ fontSize: "24px" }}>
												{e}
											</span>
											<p
												style={{
													fontSize: "16px",
													fontWeight: "700",
													marginTop: "4px",
												}}
											>
												{c}일
											</p>
										</div>
									))}
								</div>
							</div>
						)}
						{weekly.top_keywords?.length > 0 && (
							<div style={s.card}>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "600",
										marginBottom: "14px",
									}}
								>
									자주 등장한 키워드
								</p>
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: "8px",
									}}
								>
									{weekly.top_keywords.map((k, i) => (
										<span
											key={i}
											style={{
												padding: "6px 14px",
												borderRadius: "20px",
												background:
													i < 2
														? theme.primaryLight
														: theme.bg,
												color:
													i < 2
														? theme.primaryDark
														: theme.textSub,
												fontSize: "13px",
												fontWeight: "500",
											}}
										>
											{k.word}({k.count})
										</span>
									))}
								</div>
							</div>
						)}
						<div
							style={{
								...s.card,
								borderLeft: `3px solid ${theme.blue}`,
							}}
						>
							<p
								style={{
									fontSize: "14px",
									fontWeight: "600",
									marginBottom: "8px",
								}}
							>
								💡 인사이트
							</p>
							<p
								style={{
									fontSize: "13px",
									lineHeight: "1.7",
									color: theme.textSub,
								}}
							>
								{weekly.insight}
							</p>
						</div>
						<div
							style={{
								...s.card,
								borderLeft: `3px solid ${theme.primary}`,
							}}
						>
							<p
								style={{
									fontSize: "14px",
									fontWeight: "600",
									marginBottom: "8px",
								}}
							>
								🌿 추천
							</p>
							<p
								style={{
									fontSize: "13px",
									lineHeight: "1.7",
									color: theme.textSub,
								}}
							>
								{weekly.recommendation}
							</p>
						</div>
					</div>
				) : tab === "daily" ? (
					<div>
						{daily.length === 0 ? (
							<div
								style={{
									textAlign: "center",
									padding: "40px",
									color: theme.textSub,
								}}
							>
								기록이 없어요
							</div>
						) : (
							daily.map((d, i) => (
								<div
									key={i}
									className="fade-in-up"
									style={{
										...s.card,
										animationDelay: `${i * 0.05}s`,
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "10px",
											marginBottom: "8px",
										}}
									>
										<span style={{ fontSize: "24px" }}>
											{d.mood}
										</span>
										<div>
											<p
												style={{
													fontSize: "14px",
													fontWeight: "600",
												}}
											>
												{d.date}
											</p>
											{d.keywords?.length > 0 && (
												<div
													style={{
														display: "flex",
														gap: "4px",
														marginTop: "4px",
													}}
												>
													{d.keywords.map((k, j) => (
														<span
															key={j}
															style={{
																fontSize:
																	"11px",
																background:
																	theme.primaryLight,
																color: theme.primaryDark,
																padding:
																	"2px 8px",
																borderRadius:
																	"10px",
															}}
														>
															{k}
														</span>
													))}
												</div>
											)}
										</div>
									</div>
									<p
										style={{
											fontSize: "13px",
											lineHeight: "1.6",
											color: theme.textSub,
										}}
									>
										{d.summary}
									</p>
								</div>
							))
						)}
					</div>
				) : tab === "depression" && dep ? (
					<div className="fade-in-up">
						<div
							style={{
								...s.card,
								textAlign: "center",
								padding: "30px 20px",
								background: `linear-gradient(135deg, ${theme.card}, ${theme.primaryLight})`,
							}}
						>
							<p
								style={{
									fontSize: "48px",
									marginBottom: "8px",
								}}
							>
								{dep.overall_risk_level === "양호"
									? "🌿"
									: dep.overall_risk_level === "관심"
										? "🌤"
										: "☁️"}
							</p>
							<p
								style={{
									fontSize: "20px",
									fontWeight: "700",
									color:
										dep.overall_risk_level === "양호"
											? theme.accent
											: dep.overall_risk_level === "관심"
												? "#FF9800"
												: theme.danger,
								}}
							>
								{dep.overall_risk_level}
							</p>
							<p
								style={{
									fontSize: "13px",
									color: theme.textSub,
									marginTop: "8px",
									lineHeight: "1.6",
								}}
							>
								{dep.insight}
							</p>
						</div>

						{/* KlueBERT 분석 결과 */}
						{dep.kluebert_analysis ? (
							<div
								style={{
									...s.card,
									padding: "20px",
									background: theme.blueLight,
									border: `1px solid ${theme.blue}30`,
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										marginBottom: "12px",
									}}
								>
									<span style={{ fontSize: "16px" }}>🤖</span>
									<p
										style={{
											fontSize: "14px",
											fontWeight: "700",
											color: theme.blue,
										}}
									>
										KlueBERT AI 분석
									</p>
									<span
										style={{
											fontSize: "11px",
											color: theme.textSub,
											marginLeft: "auto",
										}}
									>
										최근{" "}
										{dep.kluebert_analysis.analyzed_count ||
											0}
										건
									</span>
								</div>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr 1fr",
										gap: "8px",
										marginBottom: "10px",
									}}
								>
									<div
										style={{
											textAlign: "center",
											padding: "12px 8px",
											background: theme.card,
											borderRadius: theme.radiusSm,
										}}
									>
										<p
											style={{
												fontSize: "24px",
												fontWeight: "700",
												color:
													dep.kluebert_analysis
														.probability >= 70
														? theme.danger
														: dep.kluebert_analysis
																	.probability >=
															  40
															? "#FF9800"
															: theme.accent,
											}}
										>
											{dep.kluebert_analysis.probability}%
										</p>
										<p
											style={{
												fontSize: "10px",
												color: theme.textSub,
											}}
										>
											종합 우울 확률
										</p>
									</div>
									<div
										style={{
											textAlign: "center",
											padding: "12px 8px",
											background: theme.card,
											borderRadius: theme.radiusSm,
										}}
									>
										<p
											style={{
												fontSize: "24px",
												fontWeight: "700",
												color:
													(dep.kluebert_analysis
														.negative_ratio || 0) >=
													50
														? theme.danger
														: (dep.kluebert_analysis
																	.negative_ratio ||
																	0) >= 30
															? "#FF9800"
															: theme.accent,
											}}
										>
											{dep.kluebert_analysis
												.negative_ratio || 0}
											%
										</p>
										<p
											style={{
												fontSize: "10px",
												color: theme.textSub,
											}}
										>
											부정 대화 비율
										</p>
									</div>
									<div
										style={{
											textAlign: "center",
											padding: "12px 8px",
											background: theme.card,
											borderRadius: theme.radiusSm,
										}}
									>
										<p
											style={{
												fontSize: "24px",
												fontWeight: "700",
												color:
													dep.kluebert_analysis
														.level >= 3
														? theme.danger
														: dep.kluebert_analysis
																	.level >= 2
															? "#FF9800"
															: theme.accent,
											}}
										>
											{["정상", "경미", "주의", "위험"][
												dep.kluebert_analysis.level
											] || "정상"}
										</p>
										<p
											style={{
												fontSize: "10px",
												color: theme.textSub,
											}}
										>
											위험 단계
										</p>
									</div>
								</div>
								<p
									style={{
										fontSize: "12px",
										color: theme.blue,
										textAlign: "center",
										padding: "8px",
										background: theme.card,
										borderRadius: theme.radiusSm,
									}}
								>
									AI 판정:{" "}
									{dep.kluebert_analysis.status === "있음"
										? "⚠️ 우울 징후 감지됨"
										: "✅ 우울 징후 없음"}
								</p>
							</div>
						) : (
							<div
								style={{
									...s.card,
									padding: "16px",
									background: theme.bg,
									textAlign: "center",
								}}
							>
								<p
									style={{
										fontSize: "13px",
										color: theme.textLight,
									}}
								>
									🔌 KlueBERT 모델 서버가 연결되지 않았어요
								</p>
								<p
									style={{
										fontSize: "11px",
										color: theme.textLight,
										marginTop: "4px",
									}}
								>
									키워드 기반 분석으로 대체되었습니다
								</p>
							</div>
						)}

						{dep.evidence_conversations?.length > 0 && (
							<div style={{ marginTop: "8px" }}>
								<p
									style={{
										fontSize: "15px",
										fontWeight: "600",
										marginBottom: "12px",
									}}
								>
									📌 주요 대화
								</p>
								{dep.evidence_conversations.map((ev, i) => (
									<div
										key={i}
										style={{
											...s.card,
											borderLeft: `3px solid ${theme.accent}`,
										}}
									>
										<p
											style={{
												fontSize: "14px",
												lineHeight: "1.6",
												marginBottom: "8px",
											}}
										>
											"{ev.message}"
										</p>
										<span
											style={{
												fontSize: "11px",
												color: theme.textLight,
											}}
										>
											{new Date(
												ev.created_date,
											).toLocaleString("ko-KR")}
										</span>
									</div>
								))}
							</div>
						)}
						<div
							style={{
								...s.card,
								background: theme.primaryLight,
								padding: "16px",
							}}
						>
							<p
								style={{
									fontSize: "13px",
									lineHeight: "1.6",
									color: theme.primaryDark,
								}}
							>
								💡 AI 참고 자료입니다. 정확한 진단은 전문가와
								상담해주세요.
							</p>
						</div>
					</div>
				) : (
					<div
						style={{
							textAlign: "center",
							padding: "60px",
							color: theme.textSub,
						}}
					>
						<p style={{ fontSize: "40px", marginBottom: "12px" }}>
							📊
						</p>
						<p>데이터가 없어요</p>
					</div>
				)}
			</div>
		</div>
	);
}

// ============================================================
// MY PAGE
// ============================================================
function MyPage({ user, onLogout, navigate }) {
	const [showConfirm, setShowConfirm] = useState(false);
	const isDoctor = user?.role === "doctor";
	const info = isDoctor
		? [
				{ label: "아이디", value: user?.username, icon: "🔑" },
				{ label: "이름", value: user?.nickname, icon: "👨‍⚕️" },
				{
					label: "전문 분야",
					value: user?.specialty || "-",
					icon: "🏥",
				},
				{ label: "역할", value: "의사", icon: "📋" },
			]
		: [
				{ label: "아이디", value: user?.username, icon: "🔑" },
				{ label: "닉네임", value: user?.nickname, icon: "😊" },
				{
					label: "나이",
					value: user?.age ? `${user.age}세` : "-",
					icon: "🎂",
				},
				{ label: "성별", value: user?.gender || "-", icon: "👤" },
			];
	return (
		<div style={{ ...s.page, paddingBottom: "100px" }}>
			<div style={s.topBar}>
				<button
					style={s.backBtn}
					onClick={() => navigate(isDoctor ? "doctorHome" : "home")}
				>
					{Icons.back}
				</button>
				<span style={s.topTitle}>마이페이지</span>
				<div style={{ width: "30px" }} />
			</div>
			<div style={{ padding: "0 20px" }}>
				<div
					className="fade-in-up"
					style={{
						...s.card,
						textAlign: "center",
						padding: "28px 20px",
						background: `linear-gradient(135deg, ${theme.yellowLight}, ${theme.primaryLight})`,
						border: `1px solid ${theme.yellow}40`,
					}}
				>
					<div
						style={{
							width: "64px",
							height: "64px",
							borderRadius: "50%",
							background: `linear-gradient(135deg, ${theme.primary}, #FFAB91)`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "28px",
							margin: "0 auto 12px",
							color: "#fff",
							boxShadow: "0 4px 16px rgba(255,138,101,0.3)",
						}}
					>
						{(user?.nickname || "?").charAt(0)}
					</div>
					<p
						style={{
							fontSize: "18px",
							fontWeight: "700",
							marginBottom: "4px",
						}}
					>
						{user?.nickname}
					</p>
					<p style={{ fontSize: "13px", color: theme.textSub }}>
						@{user?.username}
					</p>
				</div>
				<div
					className="fade-in-up"
					style={{ ...s.card, padding: "16px 20px" }}
				>
					<p
						style={{
							fontSize: "14px",
							fontWeight: "600",
							marginBottom: "14px",
						}}
					>
						계정 정보
					</p>
					{info.map((it, i) => (
						<div
							key={i}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "10px 0",
								borderBottom:
									i < info.length - 1
										? `1px solid ${theme.border}`
										: "none",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "10px",
								}}
							>
								<span style={{ fontSize: "16px" }}>
									{it.icon}
								</span>
								<span
									style={{
										fontSize: "13px",
										color: theme.textSub,
									}}
								>
									{it.label}
								</span>
							</div>
							<span
								style={{ fontSize: "14px", fontWeight: "500" }}
							>
								{it.value}
							</span>
						</div>
					))}
				</div>
				<button
					className="fade-in-up"
					onClick={() => setShowConfirm(true)}
					style={{
						...s.card,
						width: "100%",
						textAlign: "center",
						border: "none",
						cursor: "pointer",
						padding: "16px",
						color: theme.danger,
						fontSize: "15px",
						fontWeight: "600",
					}}
				>
					로그아웃
				</button>
				<p
					style={{
						textAlign: "center",
						fontSize: "11px",
						color: theme.textLight,
						marginTop: "12px",
					}}
				>
					마음돌봄 v1.0
				</p>
			</div>
			{showConfirm && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0,0,0,0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 100,
						padding: "20px",
					}}
					onClick={() => setShowConfirm(false)}
				>
					<div
						className="fade-in"
						style={{
							background: theme.card,
							borderRadius: theme.radius,
							padding: "28px 24px",
							maxWidth: "320px",
							width: "100%",
							textAlign: "center",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<p
							style={{
								fontSize: "16px",
								fontWeight: "600",
								marginBottom: "8px",
							}}
						>
							로그아웃 하시겠어요?
						</p>
						<p
							style={{
								fontSize: "13px",
								color: theme.textSub,
								marginBottom: "24px",
							}}
						>
							다시 로그인하면 기록은 유지돼요
						</p>
						<div style={{ display: "flex", gap: "10px" }}>
							<button
								onClick={() => setShowConfirm(false)}
								style={{
									...s.btnOutline,
									flex: 1,
									padding: "12px",
								}}
							>
								취소
							</button>
							<button
								onClick={() => {
									setShowConfirm(false);
									onLogout();
								}}
								style={{
									flex: 1,
									padding: "12px",
									borderRadius: theme.radiusSm,
									border: "none",
									background: theme.danger,
									color: "#fff",
									fontSize: "14px",
									fontWeight: "600",
									cursor: "pointer",
								}}
							>
								로그아웃
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================================
// DOCTOR — 의사 하단 네비
// ============================================================
function DoctorBottomNav({ current, navigate }) {
	const tabs = [
		{ id: "doctorHome", icon: "📋", label: "환자 관리" },
		{ id: "mypage", icon: "👤", label: "내 정보" },
	];
	return (
		<nav style={s.nav}>
			{tabs.map((t) => (
				<button
					key={t.id}
					style={s.navItem(current === t.id)}
					onClick={() => navigate(t.id)}
				>
					<span style={s.navIcon}>{t.icon}</span>
					<span>{t.label}</span>
				</button>
			))}
		</nav>
	);
}

// ============================================================
// DOCTOR HOME — 환자 목록 + 추가
// ============================================================
function DoctorHome({ user, token, navigate, setSelectedPatient }) {
	const [patients, setPatients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showAdd, setShowAdd] = useState(false);
	const [addId, setAddId] = useState("");
	const [addNote, setAddNote] = useState("");
	const [addLoading, setAddLoading] = useState(false);
	const [addError, setAddError] = useState("");

	const load = async () => {
		try {
			setPatients(await api("GET", "/doctor/patients", null, token));
		} catch (e) {}
		setLoading(false);
	};
	useEffect(() => {
		load();
	}, []);

	const addPatient = async () => {
		if (!addId.trim()) {
			setAddError("환자 아이디를 입력해주세요.");
			return;
		}
		setAddLoading(true);
		setAddError("");
		try {
			await api(
				"POST",
				"/doctor/patients",
				{
					patient_username: addId.trim(),
					note: addNote.trim() || null,
				},
				token,
			);
			setShowAdd(false);
			setAddId("");
			setAddNote("");
			setLoading(true);
			load();
		} catch (e) {
			setAddError(e.message);
		}
		setAddLoading(false);
	};

	const removePatient = async (pid) => {
		if (!confirm("이 환자를 담당 목록에서 제거할까요?")) return;
		try {
			await api("DELETE", `/doctor/patients/${pid}`, null, token);
			setLoading(true);
			load();
		} catch (e) {
			alert(e.message);
		}
	};

	const riskBadge = (p) => {
		const rl = p.risk_level || "양호";
		if (rl === "주의")
			return { label: "주의", color: theme.danger, bg: "#FFEBEE" };
		if (rl === "관심")
			return { label: "관심", color: "#FF9800", bg: "#FFF3E0" };
		return { label: "양호", color: theme.accent, bg: theme.accentLight };
	};

	return (
		<div style={{ ...s.page, paddingBottom: "100px" }}>
			<div style={{ padding: "20px 20px 8px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
					className="fade-in-up"
				>
					<div>
						<p style={{ fontSize: "13px", color: theme.textSub }}>
							👨‍⚕️ {user?.specialty || "의사"}
						</p>
						<h2 style={{ fontSize: "22px", fontWeight: "700" }}>
							{user?.nickname} 선생님
						</h2>
					</div>
					<button
						onClick={() => navigate("mypage")}
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "50%",
							background: `linear-gradient(135deg, ${theme.blue}, #64B5F6)`,
							border: "none",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "17px",
							color: "#fff",
							boxShadow: "0 3px 12px rgba(66,165,245,0.3)",
						}}
					>
						{(user?.nickname || "?").charAt(0)}
					</button>
				</div>
			</div>

			{/* 요약 카드 */}
			<div
				style={{
					padding: "0 20px",
					display: "flex",
					gap: "10px",
					marginBottom: "16px",
				}}
				className="fade-in-up"
			>
				<div
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						padding: "16px",
						background: theme.blueLight,
						border: `1px solid ${theme.blue}30`,
					}}
				>
					<p
						style={{
							fontSize: "24px",
							fontWeight: "700",
							color: theme.blue,
						}}
					>
						{patients.length}
					</p>
					<p style={{ fontSize: "11px", color: theme.textSub }}>
						담당 환자
					</p>
				</div>
				<div
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						padding: "16px",
						background: "#FFEBEE",
						border: "1px solid #EF535030",
					}}
				>
					<p
						style={{
							fontSize: "24px",
							fontWeight: "700",
							color: theme.danger,
						}}
					>
						{
							patients.filter(
								(p) => riskBadge(p).label === "주의",
							).length
						}
					</p>
					<p style={{ fontSize: "11px", color: theme.textSub }}>
						주의 필요
					</p>
				</div>
				<div
					style={{
						...s.card,
						flex: 1,
						textAlign: "center",
						padding: "16px",
						background: theme.accentLight,
						border: `1px solid ${theme.accent}30`,
					}}
				>
					<p
						style={{
							fontSize: "24px",
							fontWeight: "700",
							color: theme.accent,
						}}
					>
						{
							patients.filter(
								(p) => riskBadge(p).label === "양호",
							).length
						}
					</p>
					<p style={{ fontSize: "11px", color: theme.textSub }}>
						양호
					</p>
				</div>
			</div>

			{/* 환자 추가 버튼 */}
			<div style={{ padding: "0 20px", marginBottom: "12px" }}>
				<button
					onClick={() => setShowAdd(true)}
					style={{
						...s.btnPrimary,
						background: `linear-gradient(135deg, ${theme.blue}, #64B5F6)`,
						boxShadow: "0 4px 16px rgba(66,165,245,0.3)",
					}}
				>
					+ 담당 환자 추가
				</button>
			</div>

			{/* 환자 리스트 */}
			<div style={{ padding: "0 20px" }}>
				<p
					style={{
						fontSize: "14px",
						fontWeight: "600",
						marginBottom: "10px",
					}}
				>
					담당 환자 목록
				</p>
				{loading ? (
					<div
						style={{
							textAlign: "center",
							padding: "40px",
							color: theme.textSub,
						}}
					>
						불러오는 중...
					</div>
				) : patients.length === 0 ? (
					<div
						style={{
							textAlign: "center",
							padding: "40px",
							color: theme.textSub,
						}}
					>
						<p style={{ fontSize: "40px", marginBottom: "12px" }}>
							📋
						</p>
						<p>아직 담당 환자가 없어요</p>
						<p
							style={{
								fontSize: "12px",
								color: theme.textLight,
								marginTop: "4px",
							}}
						>
							환자를 추가해 보세요
						</p>
					</div>
				) : (
					patients.map((p, i) => {
						const risk = riskBadge(p);
						return (
							<button
								key={p.patient_id}
								className="fade-in-up"
								onClick={() => {
									setSelectedPatient(p.patient_id);
									navigate("doctorPatient");
								}}
								style={{
									...s.card,
									width: "100%",
									border: "none",
									cursor: "pointer",
									textAlign: "left",
									padding: "16px 20px",
									animationDelay: `${i * 0.06}s`,
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "12px",
									}}
								>
									<div
										style={{
											width: "42px",
											height: "42px",
											borderRadius: "50%",
											background: risk.bg,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "18px",
											flexShrink: 0,
											border: `2px solid ${risk.color}40`,
										}}
									>
										{p.last_mood || "😐"}
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
											<p
												style={{
													fontSize: "15px",
													fontWeight: "600",
												}}
											>
												{p.nickname}
											</p>
											<span
												style={{
													fontSize: "10px",
													padding: "2px 8px",
													borderRadius: "10px",
													background: risk.bg,
													color: risk.color,
													fontWeight: "600",
												}}
											>
												{risk.label}
											</span>
										</div>
										<p
											style={{
												fontSize: "12px",
												color: theme.textSub,
											}}
										>
											{p.age ? `${p.age}세` : ""}
											{p.gender ? ` · ${p.gender}` : ""}
											{p.last_activity
												? ` · 최근: ${fmtDate(p.last_activity)}`
												: ""}
										</p>
									</div>
									<div
										style={{
											textAlign: "right",
											flexShrink: 0,
										}}
									>
										{Object.entries(
											p.mood_distribution_7d || {},
										)
											.slice(0, 3)
											.map(([emoji, cnt]) => (
												<span
													key={emoji}
													style={{ fontSize: "12px" }}
												>
													{emoji}
													{cnt}
												</span>
											))}
										<p
											style={{
												fontSize: "10px",
												color: theme.textLight,
												marginTop: "2px",
											}}
										>
											최근 7일
										</p>
									</div>
								</div>
								{p.note && (
									<p
										style={{
											fontSize: "11px",
											color: theme.textSub,
											marginTop: "8px",
											padding: "6px 10px",
											background: theme.bg,
											borderRadius: "8px",
										}}
									>
										📝 {p.note}
									</p>
								)}
							</button>
						);
					})
				)}
			</div>

			{/* 환자 추가 모달 */}
			{showAdd && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0,0,0,0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 100,
						padding: "20px",
					}}
					onClick={() => setShowAdd(false)}
				>
					<div
						className="pop"
						style={{
							background: theme.card,
							borderRadius: theme.radius,
							padding: "28px 24px",
							maxWidth: "360px",
							width: "100%",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<p
							style={{
								fontSize: "17px",
								fontWeight: "700",
								marginBottom: "16px",
							}}
						>
							담당 환자 추가
						</p>
						<label style={s.label}>환자 아이디</label>
						<input
							style={{ ...s.input, marginBottom: "12px" }}
							placeholder="환자의 가입 아이디"
							value={addId}
							onChange={(e) => setAddId(e.target.value)}
						/>
						<label style={s.label}>메모 (선택)</label>
						<input
							style={{ ...s.input, marginBottom: "12px" }}
							placeholder="환자에 대한 간단한 메모"
							value={addNote}
							onChange={(e) => setAddNote(e.target.value)}
						/>
						{addError && (
							<p
								style={{
									color: theme.danger,
									fontSize: "13px",
									marginBottom: "8px",
								}}
							>
								{addError}
							</p>
						)}
						<div style={{ display: "flex", gap: "10px" }}>
							<button
								onClick={() => setShowAdd(false)}
								style={{
									...s.btnOutline,
									flex: 1,
									padding: "12px",
								}}
							>
								취소
							</button>
							<button
								onClick={addPatient}
								disabled={addLoading}
								style={{
									flex: 1,
									padding: "12px",
									borderRadius: theme.radiusSm,
									border: "none",
									background: theme.blue,
									color: "#fff",
									fontSize: "14px",
									fontWeight: "600",
									cursor: "pointer",
									opacity: addLoading ? 0.7 : 1,
								}}
							>
								{addLoading ? "추가 중..." : "추가"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================================
// DOCTOR PATIENT DETAIL — 환자 상세 (종합 리포트)
// ============================================================
function DoctorPatientDetail({ user, token, navigate, patientId }) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState("overview");
	const [chats, setChats] = useState([]);
	const [chatsLoaded, setChatsLoaded] = useState(false);
	const [loadPhase, setLoadPhase] = useState("info"); // "info" | "analyze" | "done"
	const [analyzeProgress, setAnalyzeProgress] = useState({
		done: 0,
		total: 0,
		current: "",
	});

	useEffect(() => {
		(async () => {
			try {
				// 1단계: 기본 정보 로드
				setLoadPhase("info");
				const result = await api(
					"GET",
					`/doctor/patients/${patientId}/overview`,
					null,
					token,
				);

				// 2단계: 미분석 대화가 있으면 1건씩 분석
				const pending = result.kluebert_analysis?.pending_count || 0;
				if (pending > 0) {
					setLoadPhase("analyze");
					const total = pending;
					let done = 0;
					setAnalyzeProgress({ done: 0, total, current: "" });
					while (true) {
						const r = await api(
							"POST",
							`/doctor/patients/${patientId}/analyze-next`,
							{},
							token,
						);
						done++;
						setAnalyzeProgress({
							done,
							total,
							current: r.analyzed_text || "",
						});
						if (r.done || r.remaining <= 0) break;
					}
					// 분석 완료 후 overview 재로드
					const updated = await api(
						"GET",
						`/doctor/patients/${patientId}/overview`,
						null,
						token,
					);
					setData(updated);
				} else {
					setData(result);
				}
				setLoadPhase("done");
			} catch (e) {
				alert(e.message);
				navigate("doctorHome");
			}
			setLoading(false);
		})();
	}, []);
	const loadChats = async () => {
		if (chatsLoaded) return;
		try {
			setChats(
				await api(
					"GET",
					`/doctor/patients/${patientId}/chats`,
					null,
					token,
				),
			);
		} catch (e) {}
		setChatsLoaded(true);
	};

	if (loading) {
		const isAnalyzing = loadPhase === "analyze";
		const pct =
			isAnalyzing && analyzeProgress.total > 0
				? Math.round(
						(analyzeProgress.done / analyzeProgress.total) * 100,
					)
				: loadPhase === "info"
					? 30
					: 100;
		return (
			<div
				style={{
					...s.page,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					padding: "40px",
				}}
			>
				<div
					style={{
						width: "100%",
						maxWidth: "300px",
						textAlign: "center",
					}}
				>
					<p
						className="float"
						style={{ fontSize: "48px", marginBottom: "20px" }}
					>
						{isAnalyzing ? "🤖" : "📋"}
					</p>
					<p
						style={{
							fontSize: "16px",
							fontWeight: "600",
							marginBottom: "6px",
							color: theme.text,
						}}
					>
						{isAnalyzing
							? "KlueBERT AI 분석 중"
							: "환자 정보 불러오는 중"}
					</p>
					{isAnalyzing ? (
						<>
							<p
								style={{
									fontSize: "22px",
									fontWeight: "700",
									color: theme.blue,
									marginBottom: "4px",
								}}
							>
								{analyzeProgress.done} / {analyzeProgress.total}
							</p>
							<p
								style={{
									fontSize: "12px",
									color: theme.textSub,
									marginBottom: "16px",
								}}
							>
								대화 분석 완료
							</p>
							{analyzeProgress.current && (
								<p
									style={{
										fontSize: "11px",
										color: theme.textLight,
										marginBottom: "12px",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									"{analyzeProgress.current}..."
								</p>
							)}
						</>
					) : (
						<p
							style={{
								fontSize: "13px",
								color: theme.textSub,
								marginBottom: "20px",
							}}
						>
							잠시만 기다려주세요
						</p>
					)}
					<div
						style={{
							width: "100%",
							height: "8px",
							background: theme.border,
							borderRadius: "4px",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								width: `${pct}%`,
								height: "100%",
								background: `linear-gradient(90deg, ${theme.blue}, #64B5F6)`,
								borderRadius: "4px",
								transition: "width 0.4s ease",
							}}
						/>
					</div>
				</div>
			</div>
		);
	}
	if (!data) return null;

	const { patient: pt, summary: sm } = data;
	const riskColors = {
		high: { color: theme.danger, bg: "#FFEBEE", icon: "🔴" },
		mid: { color: "#FF9800", bg: "#FFF3E0", icon: "🟡" },
		low: { color: theme.accent, bg: theme.accentLight, icon: "🟢" },
	};
	const rc = riskColors[sm.risk_color] || riskColors.low;
	const ts = (a) => ({
		flex: 1,
		padding: "10px",
		border: "none",
		borderBottom: `2px solid ${a ? theme.blue : "transparent"}`,
		background: "none",
		color: a ? theme.blue : theme.textSub,
		fontWeight: a ? "600" : "400",
		fontSize: "13px",
		cursor: "pointer",
	});

	return (
		<div style={{ ...s.page, paddingBottom: "100px" }}>
			<div style={s.topBar}>
				<button
					style={s.backBtn}
					onClick={() => navigate("doctorHome")}
				>
					{Icons.back}
				</button>
				<span style={s.topTitle}>환자 상세</span>
				<div style={{ width: "30px" }} />
			</div>
			<div style={{ padding: "0 20px" }}>
				{/* 환자 프로필 카드 */}
				<div
					className="fade-in-up"
					style={{
						...s.card,
						padding: "20px",
						background: `linear-gradient(135deg, ${theme.blueLight}, #fff)`,
						border: `1px solid ${theme.blue}20`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "14px",
						}}
					>
						<div
							style={{
								width: "50px",
								height: "50px",
								borderRadius: "50%",
								background: rc.bg,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "24px",
								border: `2px solid ${rc.color}40`,
							}}
						>
							{(sm.mood_distribution &&
								Object.keys(sm.mood_distribution)[0]) ||
								"😐"}
						</div>
						<div style={{ flex: 1 }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								<p
									style={{
										fontSize: "18px",
										fontWeight: "700",
									}}
								>
									{pt.nickname}
								</p>
								<span
									style={{
										fontSize: "11px",
										padding: "3px 10px",
										borderRadius: "10px",
										background: rc.bg,
										color: rc.color,
										fontWeight: "600",
									}}
								>
									{rc.icon} {sm.risk_level}
								</span>
							</div>
							<p
								style={{
									fontSize: "13px",
									color: theme.textSub,
								}}
							>
								{pt.age ? `${pt.age}세` : ""}
								{pt.gender ? ` · ${pt.gender}` : ""} · @
								{pt.username}
							</p>
						</div>
					</div>
				</div>

				{/* 탭 */}
				<div
					style={{
						display: "flex",
						borderBottom: `1px solid ${theme.border}`,
						marginBottom: "12px",
					}}
				>
					<button
						style={ts(tab === "overview")}
						onClick={() => setTab("overview")}
					>
						📊 종합
					</button>
					<button
						style={ts(tab === "diary")}
						onClick={() => setTab("diary")}
					>
						📝 일기
					</button>
					<button
						style={ts(tab === "sleep")}
						onClick={() => setTab("sleep")}
					>
						🌙 수면
					</button>
					<button
						style={ts(tab === "chat")}
						onClick={() => {
							setTab("chat");
							loadChats();
						}}
					>
						💬 대화
					</button>
				</div>

				{/* 종합 탭 */}
				{tab === "overview" && (
					<div className="fade-in-up">
						{/* KlueBERT AI 분석 */}
						{data.kluebert_analysis ? (
							<div
								style={{
									...s.card,
									padding: "20px",
									background: theme.blueLight,
									border: `1px solid ${theme.blue}30`,
									marginBottom: "12px",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										marginBottom: "12px",
									}}
								>
									<span style={{ fontSize: "16px" }}>🤖</span>
									<p
										style={{
											fontSize: "14px",
											fontWeight: "700",
											color: theme.blue,
										}}
									>
										KlueBERT AI 우울 분석
									</p>
									<span
										style={{
											fontSize: "11px",
											color: theme.textSub,
											marginLeft: "auto",
										}}
									>
										최근{" "}
										{data.kluebert_analysis.analyzed_count}
										건 분석
									</span>
								</div>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr 1fr",
										gap: "8px",
										marginBottom: "10px",
									}}
								>
									<div
										style={{
											textAlign: "center",
											padding: "12px 8px",
											background: theme.card,
											borderRadius: theme.radiusSm,
										}}
									>
										<p
											style={{
												fontSize: "24px",
												fontWeight: "700",
												color:
													data.kluebert_analysis
														.probability >= 70
														? theme.danger
														: data.kluebert_analysis
																	.probability >=
															  40
															? "#FF9800"
															: theme.accent,
											}}
										>
											{data.kluebert_analysis.probability}
											%
										</p>
										<p
											style={{
												fontSize: "10px",
												color: theme.textSub,
											}}
										>
											종합 우울 확률
										</p>
									</div>
									<div
										style={{
											textAlign: "center",
											padding: "12px 8px",
											background: theme.card,
											borderRadius: theme.radiusSm,
										}}
									>
										<p
											style={{
												fontSize: "24px",
												fontWeight: "700",
												color:
													data.kluebert_analysis
														.negative_ratio >= 50
														? theme.danger
														: data.kluebert_analysis
																	.negative_ratio >=
															  30
															? "#FF9800"
															: theme.accent,
											}}
										>
											{
												data.kluebert_analysis
													.negative_ratio
											}
											%
										</p>
										<p
											style={{
												fontSize: "10px",
												color: theme.textSub,
											}}
										>
											부정 대화 비율
										</p>
									</div>
									<div
										style={{
											textAlign: "center",
											padding: "12px 8px",
											background: theme.card,
											borderRadius: theme.radiusSm,
										}}
									>
										<p
											style={{
												fontSize: "24px",
												fontWeight: "700",
												color:
													data.kluebert_analysis
														.level >= 3
														? theme.danger
														: data.kluebert_analysis
																	.level >= 2
															? "#FF9800"
															: theme.accent,
											}}
										>
											{["정상", "경미", "주의", "위험"][
												data.kluebert_analysis.level
											] || "정상"}
										</p>
										<p
											style={{
												fontSize: "10px",
												color: theme.textSub,
											}}
										>
											위험 단계
										</p>
									</div>
								</div>
								<p
									style={{
										fontSize: "12px",
										color: theme.blue,
										textAlign: "center",
										padding: "8px",
										background: theme.card,
										borderRadius: theme.radiusSm,
									}}
								>
									AI 판정:{" "}
									{data.kluebert_analysis.status === "있음"
										? "⚠️ 우울 징후 감지됨"
										: "✅ 우울 징후 없음"}
								</p>
							</div>
						) : sm.total_diary_count === 0 &&
						  sm.critical_count === 0 ? (
							<div
								style={{
									...s.card,
									padding: "20px",
									background: theme.bg,
									textAlign: "center",
									marginBottom: "12px",
								}}
							>
								<p
									style={{
										fontSize: "32px",
										marginBottom: "8px",
									}}
								>
									💬
								</p>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "600",
										color: theme.textSub,
										marginBottom: "4px",
									}}
								>
									아직 대화 기록이 없어요
								</p>
								<p
									style={{
										fontSize: "12px",
										color: theme.textLight,
									}}
								>
									환자가 상담을 시작하면 AI 분석이 자동으로
									진행됩니다
								</p>
							</div>
						) : (
							<div
								style={{
									...s.card,
									padding: "14px",
									background: theme.bg,
									textAlign: "center",
									marginBottom: "12px",
								}}
							>
								<p
									style={{
										fontSize: "13px",
										color: theme.textLight,
									}}
								>
									🔌 KlueBERT 모델 미연결 — 키워드 기반 분석
									사용 중
								</p>
							</div>
						)}

						{/* 핵심 지표 */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "10px",
								marginBottom: "12px",
							}}
						>
							<div
								style={{
									...s.card,
									textAlign: "center",
									padding: "16px",
								}}
							>
								<p
									style={{
										fontSize: "11px",
										color: theme.textSub,
									}}
								>
									부정 기분 선택률
								</p>
								<p
									style={{
										fontSize: "22px",
										fontWeight: "700",
										color:
											sm.negative_mood_ratio >= 30
												? theme.danger
												: theme.accent,
									}}
								>
									{sm.negative_mood_ratio}%
								</p>
							</div>
							<div
								style={{
									...s.card,
									textAlign: "center",
									padding: "16px",
								}}
							>
								<p
									style={{
										fontSize: "11px",
										color: theme.textSub,
									}}
								>
									위험 대화
								</p>
								<p
									style={{
										fontSize: "22px",
										fontWeight: "700",
										color:
											sm.critical_count >= 3
												? theme.danger
												: sm.critical_count >= 1
													? "#FF9800"
													: theme.accent,
									}}
								>
									{sm.critical_count}건
								</p>
							</div>
							<div
								style={{
									...s.card,
									textAlign: "center",
									padding: "16px",
								}}
							>
								<p
									style={{
										fontSize: "11px",
										color: theme.textSub,
									}}
								>
									평균 수면
								</p>
								<p
									style={{
										fontSize: "22px",
										fontWeight: "700",
										color:
											sm.avg_sleep_hours >= 7 &&
											sm.avg_sleep_hours <= 9
												? theme.accent
												: theme.danger,
									}}
								>
									{sm.avg_sleep_hours}h
								</p>
							</div>
							<div
								style={{
									...s.card,
									textAlign: "center",
									padding: "16px",
								}}
							>
								<p
									style={{
										fontSize: "11px",
										color: theme.textSub,
									}}
								>
									기록 일수
								</p>
								<p
									style={{
										fontSize: "22px",
										fontWeight: "700",
										color: theme.blue,
									}}
								>
									{sm.total_diary_count}일
								</p>
							</div>
						</div>

						{/* 기분 분포 */}
						{Object.keys(sm.mood_distribution || {}).length > 0 && (
							<div style={s.card}>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "600",
										marginBottom: "12px",
									}}
								>
									기분 분포
								</p>
								<div
									style={{
										display: "flex",
										justifyContent: "space-around",
										flexWrap: "wrap",
										gap: "8px",
									}}
								>
									{Object.entries(sm.mood_distribution).map(
										([e, c]) => (
											<div
												key={e}
												style={{ textAlign: "center" }}
											>
												<span
													style={{ fontSize: "24px" }}
												>
													{e}
												</span>
												<p
													style={{
														fontSize: "16px",
														fontWeight: "700",
														marginTop: "4px",
													}}
												>
													{c}
												</p>
											</div>
										),
									)}
								</div>
							</div>
						)}

						{/* 키워드 */}
						{sm.top_keywords?.length > 0 && (
							<div style={s.card}>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "600",
										marginBottom: "10px",
									}}
								>
									주요 키워드
								</p>
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: "6px",
									}}
								>
									{sm.top_keywords.map((k, i) => (
										<span
											key={i}
											style={{
												padding: "5px 12px",
												borderRadius: "16px",
												background:
													i < 3
														? theme.blueLight
														: theme.bg,
												color:
													i < 3
														? theme.blue
														: theme.textSub,
												fontSize: "12px",
												fontWeight: "500",
											}}
										>
											{k.word} ({k.count})
										</span>
									))}
								</div>
							</div>
						)}

						{/* 위험 대화 */}
						{data.critical_conversations?.length > 0 && (
							<div style={{ marginTop: "4px" }}>
								<p
									style={{
										fontSize: "14px",
										fontWeight: "600",
										marginBottom: "10px",
									}}
								>
									⚠️ 주의가 필요한 대화
								</p>
								{data.critical_conversations.map((c, i) => (
									<div
										key={i}
										style={{
											...s.card,
											borderLeft: `3px solid ${theme.danger}`,
											padding: "14px 16px",
										}}
									>
										<p
											style={{
												fontSize: "13px",
												lineHeight: "1.6",
												marginBottom: "6px",
											}}
										>
											"{c.user_message}"
										</p>
										<p
											style={{
												fontSize: "11px",
												color: theme.textSub,
											}}
										>
											원인: {c.cause} · 위험도: {c.level}{" "}
											· {c.date?.slice(0, 10)}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* 일기 탭 */}
				{tab === "diary" && (
					<div className="fade-in-up">
						{data.recent_diaries?.length === 0 ? (
							<div
								style={{
									textAlign: "center",
									padding: "40px",
									color: theme.textSub,
								}}
							>
								일기 기록이 없어요
							</div>
						) : (
							data.recent_diaries?.map((d, i) => (
								<div
									key={i}
									style={{ ...s.card, padding: "14px 16px" }}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "10px",
											marginBottom: "6px",
										}}
									>
										<span style={{ fontSize: "20px" }}>
											{d.mood}
										</span>
										<p
											style={{
												fontSize: "13px",
												fontWeight: "600",
											}}
										>
											{fmtDate(d.date)}
										</p>
									</div>
									<p
										style={{
											fontSize: "13px",
											lineHeight: "1.6",
											color: theme.textSub,
										}}
									>
										{d.content
											.split("\n")
											.filter(
												(l) =>
													!l.startsWith("[") &&
													l.trim(),
											)
											.join(" ")
											.slice(0, 150)}
									</p>
								</div>
							))
						)}
					</div>
				)}

				{/* 수면 탭 */}
				{tab === "sleep" && (
					<div className="fade-in-up">
						<div
							style={{
								display: "flex",
								gap: "10px",
								marginBottom: "12px",
							}}
						>
							<div
								style={{
									...s.card,
									flex: 1,
									textAlign: "center",
									padding: "14px",
								}}
							>
								<p
									style={{
										fontSize: "11px",
										color: theme.textSub,
									}}
								>
									평균 수면
								</p>
								<p
									style={{
										fontSize: "20px",
										fontWeight: "700",
										color: theme.indigo,
									}}
								>
									{sm.avg_sleep_hours}h
								</p>
							</div>
							<div
								style={{
									...s.card,
									flex: 1,
									textAlign: "center",
									padding: "14px",
								}}
							>
								<p
									style={{
										fontSize: "11px",
										color: theme.textSub,
									}}
								>
									양호/불량
								</p>
								<p
									style={{
										fontSize: "20px",
										fontWeight: "700",
									}}
								>
									<span style={{ color: theme.accent }}>
										{sm.good_sleep_days}
									</span>
									/
									<span style={{ color: theme.danger }}>
										{sm.poor_sleep_days}
									</span>
								</p>
							</div>
						</div>
						{data.recent_sleeps?.length === 0 ? (
							<div
								style={{
									textAlign: "center",
									padding: "40px",
									color: theme.textSub,
								}}
							>
								수면 기록이 없어요
							</div>
						) : (
							data.recent_sleeps?.map((sl, i) => {
								const qE = (q) =>
									q === "good"
										? "😴"
										: q === "fair"
											? "😐"
											: "😵";
								return (
									<div
										key={i}
										style={{
											...s.card,
											padding: "12px 16px",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "10px",
												}}
											>
												<span
													style={{ fontSize: "20px" }}
												>
													{qE(sl.quality)}
												</span>
												<div>
													<p
														style={{
															fontSize: "13px",
															fontWeight: "600",
														}}
													>
														{sl.date}
													</p>
													<p
														style={{
															fontSize: "11px",
															color: theme.textSub,
														}}
													>
														{sl.bedtime}~{sl.wakeup}
													</p>
												</div>
											</div>
											<p
												style={{
													fontSize: "16px",
													fontWeight: "700",
													color: theme.indigo,
												}}
											>
												{sl.hours}h
											</p>
										</div>
										{sl.issues?.length > 0 && (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "4px",
													marginTop: "6px",
												}}
											>
												{sl.issues.map((is, j) => (
													<span
														key={j}
														style={{
															fontSize: "10px",
															background:
																theme.indigoLight,
															color: theme.indigo,
															padding: "2px 8px",
															borderRadius: "8px",
														}}
													>
														{is}
													</span>
												))}
											</div>
										)}
									</div>
								);
							})
						)}
					</div>
				)}

				{/* 대화 탭 */}
				{tab === "chat" && (
					<div className="fade-in-up">
						{!chatsLoaded ? (
							<div
								style={{
									textAlign: "center",
									padding: "40px",
									color: theme.textSub,
								}}
							>
								불러오는 중...
							</div>
						) : chats.length === 0 ? (
							<div
								style={{
									textAlign: "center",
									padding: "40px",
									color: theme.textSub,
								}}
							>
								대화 기록이 없어요
							</div>
						) : (
							(() => {
								const grouped = {};
								chats.forEach((l) => {
									const d =
										l.target_date ||
										l.created_date?.slice(0, 10) ||
										"unknown";
									if (!grouped[d]) grouped[d] = [];
									grouped[d].push(l);
								});
								const dates = Object.keys(grouped).sort(
									(a, b) => b.localeCompare(a),
								);
								return dates.map((date) => {
									const dayLogs = [
										...grouped[date],
									].reverse();
									return (
										<div
											key={date}
											style={{
												...s.card,
												padding: "12px 16px",
												marginBottom: "8px",
											}}
										>
											<p
												style={{
													fontSize: "13px",
													fontWeight: "600",
													color: theme.blue,
													marginBottom: "8px",
												}}
											>
												{fmtDate(date)} (
												{dayLogs.length}건)
											</p>
											{dayLogs.map((l, i) => (
												<div
													key={i}
													style={{
														display: "flex",
														justifyContent:
															l.role === "user"
																? "flex-end"
																: "flex-start",
														marginBottom: "4px",
													}}
												>
													<div
														style={{
															maxWidth: "85%",
															padding: "8px 12px",
															borderRadius:
																"12px",
															background:
																l.role ===
																"user"
																	? theme.blueLight
																	: theme.bg,
															fontSize: "12px",
															lineHeight: "1.5",
														}}
													>
														{l.message}
													</div>
												</div>
											))}
										</div>
									);
								});
							})()
						)}
					</div>
				)}
			</div>
		</div>
	);
}
