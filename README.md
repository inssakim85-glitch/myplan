# MyPlan · 나의 라이프 플래너

목표, 라이프 플랜, 일정·할 일, 자산관리, 공모주 청약, 통계를 한 곳에서 관리하는 개인 대시보드입니다.

- **화면**: 정적 HTML 한 장(`index.html`). Vercel에서 무료로 호스팅합니다.
- **회원가입·로그인·DB**: Supabase를 씁니다. 이메일 회원가입과 인증 메일, 비밀번호 재설정 메일, 기기 간 실시간 동기화를 지원합니다.
- **보안**: 데이터는 Supabase의 행 수준 보안(RLS)으로 보호되어 로그인한 본인만 읽고 쓸 수 있습니다.

```
myplan/
├── index.html           앱 전체 (화면 + 로직)
├── config.js            Supabase 주소·공개키 입력 (← 1번만 수정)
├── supabase/schema.sql  DB 테이블·보안 정책 (Supabase에 1번 실행)
└── vercel.json          Vercel 배포 설정
```

## 현재 배포 정보
- 사이트 주소: https://myplan-theta-umber.vercel.app
- Supabase 프로젝트: `myplan` (서울, ap-northeast-2)
- Vercel 프로젝트: `myplan` — `main` 브랜치에 커밋하면 자동 배포

---

## 처음부터 새로 설치할 때 (약 15분)

### 1단계. Supabase 프로젝트 만들기
1. https://supabase.com 에 가입·로그인한 뒤 **New project**를 누릅니다.
2. 이름(예: `myplan`)과 DB 비밀번호를 정하고, Region은 **Northeast Asia (Seoul)** 를 고릅니다.
3. 프로젝트가 만들어질 때까지 1~2분 기다립니다.

### 2단계. DB 테이블 만들기
1. 왼쪽 메뉴에서 **SQL Editor**를 열고 **New query**를 누릅니다.
2. 이 저장소의 `supabase/schema.sql` 내용을 전부 붙여넣고 **Run**을 누릅니다.
3. `Success`가 나오면 끝입니다.

### 3단계. config.js에 키 넣기
1. Supabase에서 **Project Settings → API**(또는 **Data API / API Keys**)로 갑니다.
2. **Publishable key**(sb_publishable_…)와 프로젝트 주소(https://프로젝트ID.supabase.co)를 복사합니다.
3. GitHub에서 `config.js` 파일을 열고 연필(Edit) 아이콘을 누른 뒤 두 값을 바꿔 넣고 **Commit changes**를 누릅니다.
   ```js
   SUPABASE_URL: 'https://abcdefgh.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...'
   ```
   > anon 키는 공개돼도 괜찮은 키입니다. **service_role 키는 절대 넣지 마세요.**

### 4단계. Vercel에 배포하기
1. https://vercel.com 에 **GitHub 계정으로** 가입·로그인합니다.
2. **Add New… → Project**를 누르고 이 저장소(`myplan`)를 **Import**합니다.
3. Framework Preset은 **Other**로 두고, Build 설정은 비워 둔 채 **Deploy**를 누릅니다.
4. 1분쯤 지나면 `https://myplan-xxxx.vercel.app` 같은 주소가 나옵니다. 이 주소가 내 사이트입니다.
   - 주소 이름은 **Settings → Domains**에서 바꾸거나, 가지고 있는 도메인을 연결할 수 있습니다.

### 5단계. Supabase에 사이트 주소 등록하기 (인증 메일 링크용)
1. Supabase → **Authentication → URL Configuration**으로 갑니다.
2. **Site URL**에 4단계의 Vercel 주소(예: `https://myplan-xxxx.vercel.app`)를 넣습니다.
3. **Redirect URLs**에도 같은 주소를 추가합니다. 도메인을 따로 연결했다면 그 주소도 추가합니다.
4. **Save**를 누릅니다.

> 이 단계를 빼먹으면 인증 메일 링크를 눌렀을 때 `localhost`로 이동해 버립니다.

### 6단계. 회원가입 해 보기
1. 내 사이트 주소로 들어가 **회원가입**을 합니다.
2. 받은 메일의 링크를 누르면 가입이 완료되고 자동으로 로그인됩니다. 메일이 안 보이면 스팸함도 확인해 주세요.

---

## 인증 메일을 한국어로 바꾸기 (선택)
현재 Supabase는 **외부 메일 서버(SMTP)를 연결해야** 메일 제목·본문을 바꿀 수 있습니다. 먼저 **Authentication → Emails → SMTP Settings**에서 Resend나 Gmail SMTP 같은 메일 서버를 연결한 뒤, **Templates** 탭에서 아래처럼 바꾸세요. SMTP를 연결하지 않아도 기본 영문 메일로 가입과 비밀번호 재설정은 정상적으로 됩니다.

**Confirm signup**
- Subject: `[MyPlan] 이메일 인증을 완료해 주세요`
- Body:
```html
<h2>MyPlan에 오신 것을 환영해요!</h2>
<p>아래 버튼을 누르면 가입이 완료됩니다.</p>
<p><a href="{{ .ConfirmationURL }}">이메일 인증하기</a></p>
```

**Reset Password**
- Subject: `[MyPlan] 비밀번호 재설정 안내`
- Body:
```html
<h2>비밀번호 재설정</h2>
<p>아래 버튼을 눌러 새 비밀번호를 정해 주세요. 요청하지 않았다면 이 메일은 무시하셔도 됩니다.</p>
<p><a href="{{ .ConfirmationURL }}">새 비밀번호 정하기</a></p>
```

**Change Email Address**
- Subject: `[MyPlan] 이메일 변경 확인`
- Body:
```html
<p>아래 버튼을 누르면 로그인 이메일이 {{ .NewEmail }}(으)로 변경됩니다.</p>
<p><a href="{{ .ConfirmationURL }}">이메일 변경 확인</a></p>
```

> **메일 발송 한도**: Supabase 기본 메일 서버는 시간당 보낼 수 있는 메일 수가 적습니다. 혼자나 가족끼리 쓰기에는 충분하지만, 여러 사람이 가입한다면 **Authentication → Emails → SMTP Settings**에서 Resend, Gmail SMTP 같은 외부 메일 서버를 연결하세요.

---

## 기존 데이터 옮기기 (claude.ai 버전 → 새 사이트)
1. 기존 claude.ai 사이트에서 **설정 → 백업 / 복원 열기 → 복사**를 누릅니다.
2. 새 사이트에 로그인한 뒤 **설정 → 백업 / 복원 열기**에서 **복원** 칸에 붙여넣고 **덮어쓰기 복원**을 누릅니다.

## 가입 제한하기 (선택)
가족 등 정해진 사람만 쓰게 하려면, 필요한 사람이 모두 가입한 뒤 Supabase → **Authentication → Sign In / Providers → Email**에서 **Allow new users to sign up**을 끄세요. 이미 가입한 사람은 계속 로그인할 수 있습니다.

## 수정·업데이트
`index.html`을 고쳐서 GitHub에 커밋하면 Vercel이 자동으로 다시 배포합니다(1분 내외).

## 비용
Supabase와 Vercel 모두 무료 요금제로 충분합니다. Supabase 무료 프로젝트는 **7일 동안 접속이 없으면 일시 정지**되고, 대시보드에서 다시 켤 수 있습니다. 꾸준히 쓰면 정지되지 않습니다.
