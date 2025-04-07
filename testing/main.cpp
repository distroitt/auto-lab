#include "elips.h"

const int kPerimeter = 3;
const int kSquare = 2;
const float kPart1 = 2.0;
const int kPart2 = 35;

Elips::Elips(QPointF point, QObject* parent) : Figure(point, parent) {
  Q_UNUSED(point)
}

void Elips::paint(QPainter* painter, const QStyleOptionGraphicsItem* option,
                  QWidget* widget) {
  painter->setPen(Qt::black);
  painter->setBrush(myColor);

  points_ << QPointF(startPoint().x(), startPoint().y());

  painter->drawEllipse(points_[0].x() - a, points_[0].y() - (a / kPart1), 2 * a,
                       a);

  X = startPoint().x();
  Y = startPoint().y();

  S = M_PI * kSquare * a * a;
  P = M_PI * (kPerimeter * kPerimeter * a - a * sqrt(kPart2));

  Q_UNUSED(option);
  Q_UNUSED(widget);

  m_shape = QPainterPath();
  m_shape.addEllipse(points_[0].x() - a, points_[0].y() - (a / kPart1), 2 * a,
                     a);
}
