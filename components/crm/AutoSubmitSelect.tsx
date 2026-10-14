"use client";

// Lista wyboru, która od razu wysyła swój formularz filtrów (na telefonie nie ma przycisku „Filtruj”)
export default function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
