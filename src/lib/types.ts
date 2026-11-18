export type Tipo = 'empieza' | 'contiene';

export interface Pregunta {
  letra: string;
  tipo: Tipo;
  pista: string;
  respuesta: string;
  alternativas: string[];
}

export interface Rosco {
  slug: string;
  titulo: string;
  /** Fecha ISO (YYYY-MM-DD) o cadena vacía */
  fecha: string;
  /** Segundos. 0 = sin límite de tiempo */
  tiempo: number;
  preguntas: Pregunta[];
}

/** p = pendiente, s = pasada (vuelve en la segunda vuelta), c = acierto, w = fallo */
export type Estado = 'p' | 's' | 'c' | 'w';
