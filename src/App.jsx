import { useEffect, useRef, useState } from "react";
import * as topojson from "topojson-client";
import worldJson from "./world.json";
// import lands from './name.tsv';
import {
  select,
  geoOrthographic,
  geoPath,
  geoGraticule,
  drag,
  tsv,
  geoCentroid,
  interpolate,
  easeBackOut,
} from "d3";
import useResizeObserver from "./useResizeObserver";

import "./App.css";

const worldAtlasURL =
  "https://unpkg.com/visionscarto-world-atlas@0.1.0/world/110m.json";

function App() {
  const [data, setData] = useState();
  const [move, setMove] = useState(0);
  const [lands, setLands] = useState([]);
  const [selectedLand, setSelectedLand] = useState(lands[0]);
  const [coords, setCoords] = useState();

  const svgRef = useRef();
  const containerRef = useRef();
  const dimensions = useResizeObserver(containerRef);

  useEffect(() => {
    // fetch(worldAtlasURL)
    //   .then((response) => response.json())
    //   .then((topoJSONData) => {
    //     const data = topojson.feature(topoJSONData, 'countries');
    //     setData(data);
    //     console.log(data);
    //   });
    const data = topojson.feature(worldJson, "countries");
    setData(data);
    tsv("./src/name.tsv", function (e) {
      setLands((prev) => [...prev, ...[e]]);
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    const { width, height } =
      dimensions || containerRef.current.getBoundingClientRect();
    const projection = geoOrthographic()
      .fitSize([width, height], data)
      .precision(100);

    let path = geoPath(projection);
    const svg = select(svgRef.current).call(
      drag().on("drag", (e) => dragging(e, projection, path, svg))
    );

    const movingLand = svg
      .selectAll("path.country")
      .data(data.features)
      .join("path")
      .attr("class", "country");

    let focusedCountry = country(data.features, selectedLand);
    let p = geoCentroid(focusedCountry);

    if (selectedLand && p.length > 0) {
      svg.selectAll(".country").classed("focused", false);

      movingLand
        .transition()
        .duration(2000)
        .ease(easeBackOut)
        .attrTween("rotate", function () {
          let r = interpolate(coords || projection.rotate(), [-p[0], -p[1], 0]);
          setCoords([-p[0], -p[1], 0]);
          return function (t) {
            projection.rotate(r(t));
            path = geoPath(projection);
            // console.log(projection.rotate(r(t)));
            select(this)
              .attr("d", path)
              .classed("focused", function (d) {
                return d.id == focusedCountry.id ? true : false;
              });
          };
        });
    } else {
      projection.rotate([move, 0, 0]);
      path = geoPath(projection);
      movingLand.attr("d", path);
    }

    // return () => drag.off('drag', dragging);
  }, [data, dimensions, move, selectedLand]);

  function dragging(event, projection, path, svg) {
    //if (projection === projections[1].value){
    const rotate = projection.rotate();
    const k = 100 / projection.scale();
    projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
    path = geoPath().projection(projection);
    svg.selectAll("path.country").attr("d", path);
  }

  function moveFunction() {
    setMove((prev) => {
      return prev < 350 ? prev + 10 : 0;
    });
    setSelectedLand();
    console.log(move);
  }

  function country(cnt, selectedId) {
    //   console.log({ cnt, sel });
    for (let i = 0; i < cnt.length; i++) {
      if (cnt[i].id == selectedId) {
        return cnt[i];
      }
    }
  }

  // von 0-360 eine volle Runde.

  return (
    <div ref={containerRef} className="container">
      <svg className="svg-container" ref={svgRef}></svg>
      <div className="menu">
        <button onClick={moveFunction}>Move</button>
        <select
          className="selectLand"
          onChange={(e) => setSelectedLand(e.target.value)}
        >
          {lands.map((land) => {
            return (
              <option key={land.id} value={land.id}>
                {land.name}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

export default App;
