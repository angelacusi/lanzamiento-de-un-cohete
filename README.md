# Misión espacial — El método de Euler

Aplicación educativa para simular el lanzamiento vertical de un cohete experimental y comparar el método de Euler explícito con la solución analítica de su modelo.

## Contexto y objetivo

Inspirado en la carrera espacial de 1962 y en el trabajo de las matemáticas de la NASA que recuerda la película *Talentos ocultos*. John Glenn orbitó la Tierra en la misión Friendship 7 en 1962. El cohete y sus parámetros de esta página son ficticios: el ejercicio no reproduce la trayectoria de Glenn ni pretende describir los métodos concretos utilizados en esa misión.

El estudiante puede modificar masa, empuje, gravedad, resistencia del aire, tiempo total y tamaño de paso. La aplicación calcula velocidad y altura con Euler, contrasta cada iteración con la solución exacta, muestra errores absolutos y grafica ambas variables en función del tiempo.

## Modelo matemático

Se considera movimiento vertical con masa constante, empuje y gravedad constantes, y resistencia lineal del aire:

```text
m dv/dt = T - mg - kv
dy/dt = v
v(0) = 0, y(0) = 0
```

Al despejar la aceleración:

```text
dv/dt = a - bv
a = (T - mg)/m, b = k/m
```

Para un paso `h`, Euler explícito actualiza el estado usando los valores al inicio del paso:

```text
v[n+1] = v[n] + h(a - b v[n])
y[n+1] = y[n] + h v[n]
```

La solución analítica, para `b > 0`, es:

```text
v(t) = (a/b)(1 - e^(-bt))
y(t) = (a/b)t - (a/b²)(1 - e^(-bt))
```

Con los valores iniciales `m = 1000 kg`, `T = 15000 N`, `g = 9.81 m/s²` y `k = 100 kg/s`, resulta `a = 5.19 m/s²` y `b = 0.1 s⁻¹`.

## Ejecución

Abre `index.html` en un navegador moderno. No se requieren dependencias, cuenta ni servidor de aplicación.

## Archivos

- `index.html`: contenido de la página y secciones educativas.
- `styles.css`: estilos adaptables a escritorio y móvil.
- `app.js`: validación, simulación de Euler, solución exacta, tablas y gráficas SVG.

## Validaciones

La masa, gravedad, resistencia, tiempo y tamaño de paso deben ser positivos; el empuje puede ser cero o mayor. Cada simulación admite hasta 20 000 pasos. Si una entrada no es válida o un cálculo excede el rango numérico, la aplicación muestra un mensaje en pantalla.
