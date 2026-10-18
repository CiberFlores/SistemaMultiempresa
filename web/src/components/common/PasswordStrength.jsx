import { Check, X } from "lucide-react";
import { validarPassword } from "../../utils/password";

export default function PasswordStrength({ value = "" }) {
  const result = validarPassword(value);
  return <div className="password-strength"><div className="password-meter"><span style={{width:`${(result.score/6)*100}%`}} /></div><div className="password-strength-head"><strong>{result.label}</strong><span>{result.score}/6 requisitos</span></div><div className="password-rules">{result.checks.map((item)=><span key={item.key} className={item.ok?"ok":"pending"}>{item.ok?<Check size={13}/>:<X size={13}/>} {item.label}</span>)}</div></div>;
}
