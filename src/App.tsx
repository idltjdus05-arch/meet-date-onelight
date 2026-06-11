import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";

type Page = "invite" | "yay" | "schedule";
type ScheduleStep = "dates" | "place" | "nickname";

type CalendarDay = {
  iso: string;
  day: number;
  disabled: boolean;
};

type CalendarMonth = {
  title: string;
  blanks: number;
  days: CalendarDay[];
};

type ResponseRow = {
  id: string;
  nickname: string;
  selected_dates: string[];
  place: string;
  created_at: string;
  updated_at: string;
};

const friendNicknames = [
  "서연",
  "예린",
  "작곰",
  "도베",
  "가현",
  "예린",
  "수린",
];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildCalendarMonths(start: Date, end: Date): CalendarMonth[] {
  const months: CalendarMonth[] = [];

  let current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);

      days.push({
        iso: toIsoDate(date),
        day,
        disabled: date < start || date > end,
      });
    }

    months.push({
      title: `${year}년 ${month + 1}월`,
      blanks: firstDay.getDay(),
      days,
    });

    current = new Date(year, month + 1, 1);
  }

  return months;
}

function formatKoreanDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function App() {
  const [page, setPage] = useState<Page>("invite");
  const [isAdmin, setIsAdmin] = useState(window.location.hash === "#admin");

  useEffect(() => {
    const checkHash = () => {
      setIsAdmin(window.location.hash === "#admin");
    };

    window.addEventListener("hashchange", checkHash);

    return () => {
      window.removeEventListener("hashchange", checkHash);
    };
  }, []);

  if (isAdmin) {
    return (
      <main className="app">
        <AdminPage />
      </main>
    );
  }

  return (
    <main className="app">
      {page === "invite" && <InvitePage onYes={() => setPage("yay")} />}
      {page === "yay" && <YayPage onNext={() => setPage("schedule")} />}
      {page === "schedule" && <SchedulePage />}
    </main>
  );
}

function InvitePage({ onYes }: { onYes: () => void }) {
  const [yesSize, setYesSize] = useState(1);
  const [noPosition, setNoPosition] = useState({ x: 0, y: 0 });

  const moveNoButton = () => {
    const randomX = Math.floor(Math.random() * 260) - 130;
    const randomY = Math.floor(Math.random() * 180) - 90;

    setNoPosition({ x: randomX, y: randomY });
    setYesSize((prev) => Math.min(prev + 0.15, 3.5));
  };

  const clickNoButton = () => {
    setYesSize((prev) => Math.min(prev + 0.3, 3.6));
    moveNoButton();
  };

  return (
    <section className="card invite-card">
      <img
        className="samoyed-bounce"
        src="/samoyed.png"
        alt="사모예드 강아지"
      />

      <h1>우리 여름방학에 한번 볼까?</h1>
      <p>No 눌러보고 싶으면 눌러보든지 ㅡ////ㅡ *</p>

      <div className="button-area">
        <button
          className="yes-button"
          style={{ transform: `scale(${yesSize})` }}
          onClick={onYes}
        >
          Yes
        </button>

        <button
          className="no-button"
          style={{
            transform: `translate(${noPosition.x}px, ${noPosition.y}px)`,
          }}
          onMouseEnter={moveNoButton}
          onClick={clickNoButton}
        >
          No
        </button>
      </div>
    </section>
  );
}

function YayPage({ onNext }: { onNext: () => void }) {
  return (
    <section className="card">
      <h1>yayy~~~~</h1>

      <img className="hug-gif" src="/hug.gif" alt="끌어안는 강아지" />

      <p>좋아 이제 진짜 만날 날짜를 정해보자!</p>

      <button className="next-button" onClick={onNext}>
        날짜 고르러 가기
      </button>
    </section>
  );
}

function SchedulePage() {
  const [step, setStep] = useState<ScheduleStep>("dates");

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [customPlace, setCustomPlace] = useState("");
  const [selectedNickname, setSelectedNickname] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const months = useMemo(() => {
    const summerStart = new Date(2026, 5, 24);
    const summerEnd = new Date(2026, 7, 31);

    return buildCalendarMonths(summerStart, summerEnd);
  }, []);

  const toggleDate = (iso: string) => {
    setSelectedDates((prev) => {
      if (prev.includes(iso)) {
        return prev.filter((date) => date !== iso);
      }

      return [...prev, iso].sort();
    });
  };

  const selectedPlace = place === "기타" ? customPlace : place;

  const canGoPlace = selectedDates.length > 0;
  const canGoNickname = selectedPlace.trim() !== "";
  const canSubmit =
    selectedNickname !== "" &&
    selectedDates.length > 0 &&
    selectedPlace.trim() !== "";

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitMessage("");

    const { error } = await supabase.from("responses_onelight").upsert(
      {
        nickname: selectedNickname,
        selected_dates: selectedDates,
        place: selectedPlace.trim(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "nickname",
      }
    );

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setSubmitMessage("저장 중 오류가 났어 ㅠㅠ 다시 시도해줘!");
      return;
    }

    setSubmitMessage("제출 완료! 나중에 다시 제출하면 선택이 수정돼.");
  };

  return (
    <section className="schedule-page">
      {step === "dates" && (
        <>
          <div className="schedule-header">
            <span className="step-badge">1 / 3</span>
            <h1>가능한 날짜를 골라줘!</h1>
            <p>6월 24일부터 8월 31일까지 가능한 날짜를 전부 선택하면 돼.</p>
          </div>

          <div className="calendar-list">
            {months.map((month) => (
              <div className="calendar-card" key={month.title}>
                <h2>{month.title}</h2>

                <div className="week-row">
                  <span>일</span>
                  <span>월</span>
                  <span>화</span>
                  <span>수</span>
                  <span>목</span>
                  <span>금</span>
                  <span>토</span>
                </div>

                <div className="date-grid">
                  {Array.from({ length: month.blanks }).map((_, index) => (
                    <div className="empty-date" key={`blank-${index}`} />
                  ))}

                  {month.days.map((date) => {
                    const isSelected = selectedDates.includes(date.iso);

                    return (
                      <button
                        key={date.iso}
                        className={`date-button ${
                          isSelected ? "selected" : ""
                        }`}
                        disabled={date.disabled}
                        onClick={() => toggleDate(date.iso)}
                      >
                        {date.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="step-card">
            <h2>선택한 날짜</h2>

            <p>
              {selectedDates.length > 0
                ? selectedDates.map(formatKoreanDate).join(", ")
                : "아직 없음"}
            </p>

            <div className="step-actions">
              <button
                className="submit-button"
                disabled={!canGoPlace}
                onClick={() => setStep("place")}
              >
                다음: 장소 고르기
              </button>
            </div>
          </div>
        </>
      )}

      {step === "place" && (
        <div className="step-card single-step-card">
          <span className="step-badge">2 / 3</span>

          <h1>어디에서 볼까?</h1>
          <p>대구, 서울, 기타 중에서 골라줘.</p>

          <div className="place-options">
            {["대구", "서울", "기타"].map((option) => (
              <label className="place-option" key={option}>
                <input
                  type="radio"
                  name="place"
                  value={option}
                  checked={place === option}
                  onChange={(event) => setPlace(event.target.value)}
                />
                {option}
              </label>
            ))}
          </div>

          {place === "기타" && (
            <input
              className="custom-place-input"
              placeholder="원하는 장소를 적어줘!"
              value={customPlace}
              onChange={(event) => setCustomPlace(event.target.value)}
            />
          )}

          <div className="mini-summary">
            <p>
              <strong>선택한 날짜:</strong>{" "}
              {selectedDates.map(formatKoreanDate).join(", ")}
            </p>

            <p>
              <strong>선택한 장소:</strong>{" "}
              {selectedPlace ? selectedPlace : "아직 없음"}
            </p>
          </div>

          <div className="step-actions">
            <button className="back-button" onClick={() => setStep("dates")}>
              이전
            </button>

            <button
              className="submit-button"
              disabled={!canGoNickname}
              onClick={() => setStep("nickname")}
            >
              다음: 이름 고르기
            </button>
          </div>
        </div>
      )}

      {step === "nickname" && (
        <div className="step-card single-step-card">
          <span className="step-badge">3 / 3</span>

          <h1>너는 누구야?</h1>
          <p>본인 이름을 선택하고 제출하면 끝!</p>

          <select
            className="nickname-select"
            value={selectedNickname}
            onChange={(event) => setSelectedNickname(event.target.value)}
          >
            <option value="">이름을 선택해줘!</option>

            {friendNicknames.map((nickname) => (
              <option key={nickname} value={nickname}>
                {nickname}
              </option>
            ))}
          </select>

          <div className="mini-summary">
            <p>
              <strong>이름:</strong>{" "}
              {selectedNickname ? selectedNickname : "아직 없음"}
            </p>

            <p>
              <strong>선택한 날짜:</strong>{" "}
              {selectedDates.map(formatKoreanDate).join(", ")}
            </p>

            <p>
              <strong>선택한 장소:</strong> {selectedPlace}
            </p>
          </div>

          <div className="step-actions">
            <button className="back-button" onClick={() => setStep("place")}>
              이전
            </button>

            <button
              className="submit-button"
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "제출 중..." : "제출하기"}
            </button>
          </div>

          {submitMessage && <p className="submit-message">{submitMessage}</p>}
        </div>
      )}
    </section>
  );
}

function AdminPage() {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResponses = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("responses_onelight")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      setResponses([]);
    } else {
      setResponses(data ?? []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const dateTop5 = useMemo(() => {
    const countMap: Record<string, number> = {};

    responses.forEach((response) => {
      response.selected_dates.forEach((date) => {
        countMap[date] = (countMap[date] ?? 0) + 1;
      });
    });

    return Object.entries(countMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [responses]);

  const placeResults = useMemo(() => {
    const countMap: Record<string, number> = {};

    responses.forEach((response) => {
      countMap[response.place] = (countMap[response.place] ?? 0) + 1;
    });

    return Object.entries(countMap)
      .map(([place, count]) => ({ place, count }))
      .sort((a, b) => b.count - a.count);
  }, [responses]);

  return (
    <section className="admin-page">
      <div className="admin-header">
        <h1>관리자 결과 확인</h1>
        <p>친구들이 가장 많이 선택한 날짜 TOP 5를 볼 수 있어.</p>

        <button className="submit-button" onClick={fetchResponses}>
          새로고침
        </button>
      </div>

      {isLoading ? (
        <div className="admin-card">
          <p>불러오는 중...</p>
        </div>
      ) : (
        <>
          <div className="admin-card">
            <h2>제출 인원</h2>
            <p className="big-number">{responses.length}명</p>
          </div>

          <div className="admin-card">
            <h2>날짜 TOP 5</h2>

            {dateTop5.length === 0 ? (
              <p>아직 제출된 날짜가 없어.</p>
            ) : (
              <div className="rank-list">
                {dateTop5.map((item, index) => (
                  <div className="rank-item" key={item.date}>
                    <strong>
                      {index + 1}위. {formatKoreanDate(item.date)}
                    </strong>
                    <span>{item.count}명 가능</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-card">
            <h2>장소 투표 결과</h2>

            {placeResults.length === 0 ? (
              <p>아직 선택된 장소가 없어.</p>
            ) : (
              <div className="rank-list">
                {placeResults.map((item) => (
                  <div className="rank-item" key={item.place}>
                    <strong>{item.place}</strong>
                    <span>{item.count}명 선택</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-card">
            <h2>친구별 응답</h2>

            {responses.length === 0 ? (
              <p>아직 제출한 친구가 없어.</p>
            ) : (
              <div className="response-list">
                {responses.map((response) => (
                  <div className="response-item" key={response.id}>
                    <strong>{response.nickname}</strong>
                    <p>
                      날짜:{" "}
                      {response.selected_dates
                        .map(formatKoreanDate)
                        .join(", ")}
                    </p>
                    <p>장소: {response.place}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default App;