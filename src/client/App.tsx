import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemePicker } from "./components/ThemePicker";
import { Home } from "./pages/Home";
import { Room } from "./pages/Room";

export function App() {
  return (
    <BrowserRouter>
      <ThemePicker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
