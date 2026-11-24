// Detecta las caras de varias fotos con el framework Vision de macOS.
//
//   swift scripts/importar/detectar-caras.swift foto1.jpg foto2.jpg ...
//
// Imprime un JSON { "<ruta>": [{ "x", "y", "ancho", "alto", "roll" }] } en píxeles,
// con el origen arriba a la izquierda. Las fotos ya tienen que venir enderezadas
// (sin orientación EXIF), como las deja scripts/importar/arreglar-fotos.ts.
import Foundation
import ImageIO
import Vision

struct Cara: Codable {
  let x: Double
  let y: Double
  let ancho: Double
  let alto: Double
  /// Inclinación de la cara en radianes (0 = derecha). Una foto acostada da cerca de ±1,57.
  let roll: Double
}

var resultado: [String: [Cara]] = [:]

for ruta in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: ruta)
  guard let origen = CGImageSourceCreateWithURL(url as CFURL, nil),
    let imagen = CGImageSourceCreateImageAtIndex(origen, 0, nil)
  else {
    resultado[ruta] = []
    continue
  }
  let ancho = Double(imagen.width)
  let alto = Double(imagen.height)
  let pedido = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: imagen, options: [:]).perform([pedido])
  resultado[ruta] = (pedido.results ?? []).map { cara in
    // Vision usa coordenadas normalizadas con el origen abajo a la izquierda.
    let caja = cara.boundingBox
    return Cara(
      x: caja.minX * ancho, y: (1 - caja.maxY) * alto, ancho: caja.width * ancho, alto: caja.height * alto,
      roll: cara.roll?.doubleValue ?? 0)
  }
}

let datos = try JSONEncoder().encode(resultado)
print(String(data: datos, encoding: .utf8) ?? "{}")
