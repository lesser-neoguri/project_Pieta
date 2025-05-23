# 폰트 사용 가이드라인

## 폰트 시스템 개요

PIETA 프로젝트는 다국어(한글/영문) 지원을 위해 다음과 같은 폰트 시스템을 사용합니다:

1. **Noto Sans KR**: 한글 텍스트를 위한 기본 폰트 (`font-korean` 클래스)
2. **Geist Sans**: 영문 텍스트를 위한 기본 폰트 (`font-geist` 클래스)
3. **Geist Mono**: 코드 및 고정폭 텍스트를 위한 폰트 (`font-mono` 클래스)

## 폰트 클래스 사용법

### 기본 폰트 (`font-sans`)

기본적으로 모든 텍스트는 `font-sans` 클래스를 사용합니다. 이는 영문에 Geist Sans, 한글에 Noto Sans KR을 적용합니다.

```jsx
<p className="font-sans">
  기본 텍스트입니다. This is default text.
</p>
```

### 한글 중심 텍스트 (`font-korean`)

한글 텍스트가 주를 이루는 경우 `font-korean` 클래스를 사용합니다.

```jsx
<p className="font-korean">
  한글 중심의 텍스트입니다.
</p>
```

### 영문 전용 텍스트 (`font-geist`)

영문 전용 텍스트나 브랜드명 등에는 `font-geist` 클래스를 사용합니다.

```jsx
<h1 className="font-geist tracking-widest uppercase">
  PIETA
</h1>
```

### 코드 및 고정폭 텍스트 (`font-mono`)

코드, 숫자 데이터 등에는 `font-mono` 클래스를 사용합니다.

```jsx
<code className="font-mono">
  const price = 100000;
</code>
```

## CSS 변수 사용

직접 폰트 패밀리를 지정해야 하는 경우, CSS 변수를 사용할 수 있습니다:

```css
.custom-text {
  font-family: var(--font-korean), sans-serif;
}

.custom-code {
  font-family: var(--font-mono), monospace;
}
```

## 주의사항

1. 기존에 사용하던 `font-pretendard` 클래스는 `font-korean`으로 대체되었습니다.
2. 서체 관련 설정은 `layout.tsx`, `globals.css`, `tailwind.config.js` 파일에서 관리됩니다.
3. 폰트 로딩 최적화를 위해 필요한 폰트 가중치(weight)만 가져오도록 주의하세요. 