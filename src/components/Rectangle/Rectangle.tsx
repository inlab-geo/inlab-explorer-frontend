"use client"
import React, { useEffect, useRef, useState, useContext, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { HierarchyNode, HierarchyPointNode } from 'd3';
import '../../../app/style.css'
import { TreeNode, TreeProps, onClick } from './treeComponent';
import {style} from './style'
import { Style } from 'util';
import { ThemeContext } from '@emotion/react';


// const canvas = document.createElement('canvas');
// const ctx = canvas.getContext('2d');



function collapse(d: any) {
  if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
  }
}


function measureTextWidth(text : string, font : string) {
  // We'll return a default value of 0 for server-side rendering
  if (typeof document === 'undefined') {
    return 0;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (context) {
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }

  return 0;  // fallback in case getting the context fails
}

interface selected {
  selectedTree: any; 
  selectedTheme: any
}



const TreeComponent: React.FC<selected> = ({selectedTree, selectedTheme}) => {

  const tree: TreeProps = {
    data: null
  }
  const d3Container = useRef<SVGSVGElement | null>(null);

  const [treeData, setTreeData] = useState<TreeNode | null>(null);

  const [windowSize, setWindowSize] = useState<{width: number, height: number}>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080 
});

  const [treeTheme, setTreeTheme] = useState(style.LightTheme)


  useEffect(() => {
    let pressTimer: NodeJS.Timeout | null = null;
    if (d3Container.current) {
      const svg = d3.select(d3Container.current);
      svg.selectAll('.node')
        .style('fill', function(d : any) {
          return d.parent ? treeTheme.nodeFill : treeTheme.headnodeFill;
        });
    }
  }, [treeTheme]);



  useEffect(() => {
    if (selectedTree === 'CoFI Methods') {
      fetch('https://jsonofthetree.s3.ap-southeast-2.amazonaws.com/method_relation.json')
      .then((response) => response.json())
      .then((data) => setTreeData(data))
      .catch((error) => console.error(error));
    }
    if (selectedTree === "Espresso Problems") {
      fetch('https://jsonofthetree.s3.ap-southeast-2.amazonaws.com/app_relation.json')
      .then((response) => response.json())
      .then((data) => setTreeData(data))
      .catch((error) => console.error(error));
    }

    if (selectedTree === "CoFI Examples") {
    }
  }, [selectedTree]);


  useEffect(() => {
    switch (selectedTheme) {
      case 'use light theme': {setTreeTheme(style.LightTheme);break;}
      case 'use dark theme': {setTreeTheme(style.DarkTheme);break;}
      case 'use special theme': {setTreeTheme(style.SpecialTheme);break;}
    }
  }, [selectedTheme]);


  function assignTreeAttr(t : TreeNode) {
    let block_width;
    const textMetrics = measureTextWidth(t.name , "14px Arial");
    block_width = textMetrics + 40 ;
    t.width = block_width + 20
    t.children?.forEach(assignTreeAttr)
  }

  function generate_des(d : TreeProps) {
    return d.data?.description? d.data?.description : d.data?.name + "contains many sub node, please expand"
  }

  function gen_button(d : TreeProps, color : string, textColor : string, width : number) {
    return (`
    <a href=" ${d.data?.link_git} " target="_blank" style="text-decoration: none;"><button style="background-color: ${d.data?.link_git? color : "#b8b8b8"}; width: ${width}px; border: none; color: white; padding: 5px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px; box-sizing: border-box;">Git</button>
    <a href=" ${d.data?.link_doc} " target="_blank" style="text-decoration: none;"><button style="background-color: ${d.data?.link_doc? color : "#b8b8b8"}; width: ${width}px; border: none; color: white; padding: 5px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px; box-sizing: border-box;">Documentation</button>
    <a href="${d.data}" target="_blank" style="text-decoration: none;"><button style="background-color: #008CBA; width: ${width}px;border: none; color: white; padding: 5px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px; box-sizing: border-box;">Select Example</button>
    <a href="${d.data}" target="_blank" style="text-decoration: none;"><button style="background-color: #008CBA; width: ${width}px;color: black; border: none; padding: 5px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px; box-sizing: border-box;">and..?</button>`
    )
    }




  useEffect(() => {
    let pressTimer: NodeJS.Timeout | null = null;
    if (treeData && d3Container.current) {
      assignTreeAttr(treeData)
        const svg = d3.select(d3Container.current);
        const tooltip = d3.select("#tooltip");

        var i = 0, duration = 750;
        let treeRoot: any;
        var nodeSize = { width: 200, height: 200}
        var treemap = d3.tree()
          .nodeSize([nodeSize.width, nodeSize.height])
          .separation(function(a : any, b : any) {
            var totalWidth = a.data.width + b.data.width;
            return ((totalWidth / 2) + 20) / 200
          });    

        // Assigns parent, children, height, depth
        treeRoot = d3.hierarchy(treeData, (d: any) => {
            return d.children;
        });
        treeRoot.x0 = 0;
        treeRoot.y0 = 0;
        treeRoot.children.forEach(collapse);
        
        const g = svg.append("g")
        var zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

      // select the svg and call the zoom behavior

        svg.call(zoom)
        svg.call(zoom.transform, d3.zoomIdentity.translate(200, 100).scale(1.05));


        const update = (source : any) => {
          var data = treemap(treeRoot);
          var nodes = data.descendants(),
              links = data.descendants().slice(1);
          nodes.forEach(function(d : any) {
            d.y = d.depth * 100
          });


          var node = g.selectAll<SVGGElement, HierarchyPointNode<unknown>>("g.node")
          .data(nodes, function(d: any) {
              return d.id || (d.id = ++i);
          });

          var nodeEnter = node
              .enter()
              .append("g")
              .attr("class", "node")
              .attr("transform", function(d) {
                return "translate(" + source.x0 + "," + source.y0 + ")";
              })
              .on("click", click);


              nodeEnter
                .attr("class", "node")
                .attr("r", 1e-6)
                .style("fill", function(d) {
                  return d.parent ? treeTheme.nodeFill : treeTheme.headnodeFill;
                });
              
              
              nodeEnter
                .append("rect")
                .attr("rx", function(d : any) {
                  if (d.parent) return d.children || d._children ? 3 : 6;
                  return 20;
                })
                .attr("ry", function(d : any) {
                  if (d.parent) return d.children || d._children ? 3 : 6;
                  return 10;
                })
                .attr("stroke-width", function(d) {
                  return d.parent ? 1 : 0;
                })
                .attr("stroke", function(d : any) {
                  return d.children || d._children
                    ? treeTheme.nodeStroke
                    : "rgb(38, 222, 176)";
                })
                .attr("stroke-dasharray", function(d : any) {
                  return d.children || d._children ? "0" : "2.2";
                })
                .attr("stroke-opacity", function(d : any) {
                  return d.children || d._children ? "1" : "0.6";
                })
                .attr("x", function(d : any){
                  return -d.data.width / 2
                }
                )
                .attr("y", -15)


                .attr("width", function(d : any) {
                  return d.data.width;
                })
                .attr("height", 30);
              
              nodeEnter
                .append("text")
                .attr("font-size", "2em Arial")
                .attr('pointer-events', 'none')
                .style("font-family", "Arial")
                .style("fill", function(d : any) {
                  if (d.parent) {
                    return d.children || d._children ? treeTheme.text : "rgb(38, 222, 176)";
                  }
                  return "rgb(39, 43, 77)";
                })
                .attr("dy", ".35em")
                .attr("x", function(d) {
                  return d.parent ? 0 : 0;
                })
                .attr("text-anchor", function(d) {
                  return "middle";
                })
                .text(function(d : any) {
                  return d.data.name;
                });

                nodeEnter
                .on("mousedown", function (event, d : any) {
                    // Clear any existing timer before setting a new one
                    if (pressTimer !== null) {
                        clearTimeout(pressTimer);
                    }   
            
                    pressTimer = setTimeout(function() { 
                        // If the mousedown event's duration is longer than 500 ms, it is a long press
                        tooltip.style("left", event.pageX + "px")
                            .style("top", event.pageY + "px")
                            .style("opacity", 1)
                            .html(`
                            <div style="border: 1px solid black; width: ${d.data.width + 20}px; min-width: 200px ;  max-height: 500px; overflow: auto; padding: 10px;">
                              <div style="background-color: lightgray; padding: 10px;">
                                ${d.data.name}
                              </div>
                              <div style="background-color: white; padding: 10px; margin-top: 10px; word-wrap: break-word; width: ${d.data.width}px;min-height: 150px;">
                                  ${generate_des(d)}
                              </div>
                              <div style="display: flex; justify-content: space-around; margin-top: 10px; width: ${d.data.width}px; min-width: 160px;">
                                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width:100%">
                                ${gen_button(d, "#008CBA", "#fff", d.data.width)}
                                </div>
                              </div>
                            </div>
                            `);
                    }, 800); // This delay of 500 ms could be adjusted
                    event.stopPropagation();
                });
              
            document.addEventListener("mouseup", function () {
                // Clear the timer when the mouse button is released
                if(pressTimer !== null) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                    console.log("clear!");
                }
            });
                

              var nodeUpdate = nodeEnter.merge(node);

              nodeUpdate
                .transition()
                .duration(duration)
                .attr("transform", function(d) {
                  return "translate(" + d.x + "," + d.y + ")";
                });
              var nodeExit = node
                .exit()
                .transition()
                .duration(duration)
                .attr("transform", function(d) {
                  return "translate(" + source.x + "," + source.y + ")";
                })
                .remove();
              nodeExit.select("rect").style("opacity", 1e-6);
              nodeExit.select("rect").attr("stroke-opacity", 1e-6);
              nodeExit.select("text").style("fill-opacity", 1e-6);

              
              var link = g.selectAll<SVGPathElement, HierarchyPointNode<unknown>>("path.link").data(links, function(d : any) {
                return d.id;
              });
              var linkEnter = link
              .enter()
              .insert("path", "g")
              .attr("class", "link")
              .attr("d", function(d) {
                var o = { x: source.x0, y: source.y0 };
                return diagonal(o, o);
              });
              var linkUpdate = linkEnter.merge(link);
              linkUpdate
                .transition()
                .duration(duration)
                .attr("d", function(d) {
                  return diagonal(d, d.parent);
                });
              var linkExit = link
                .exit()
                .transition()
                .duration(duration)
                .attr("d", function(d) {
                  var o = { x: source.x, y: source.y };
                  return diagonal(o, o);
                })
                .remove();

              nodes.forEach(function(d : any) {
                d.x0 = d.x;
                d.y0 = d.y;
              });

              function diagonal(s : any, d : any) {
                let path = `M ${s.x} ${s.y}
                            C ${(s.x + d.x) / 2} ${s.y},
                              ${(s.x + d.x) / 2} ${d.y},
                              ${d.x} ${d.y}`;
            
                return path;
            }

              function click(event:any, d : any) {
                if (d.children) {
                  d._children = d.children;
                  d.children = null;
                } else {
                  d.children = d._children;
                  d._children = null;
                }
                update(d);
                let center = {w: windowSize.width/2, h: windowSize.height/3}
                console.log(center)
                let svgNode = svg.node();
                let currentScale = svgNode? d3.zoomTransform(svgNode).k : 2;
                console.log(currentScale)
                svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate((center.w - d.x)*currentScale + (1.05 - currentScale)*center.w, (center.h - d.y)*currentScale + (1.05 - currentScale)*center.h).scale(currentScale));
              }
        }
        svg.on("click", function() {
          tooltip.style("opacity", 0);
      });

        update(treeRoot);
        // Collapse after the second level
        treeRoot.children.forEach(collapse);
        

        return function cleanup() {
            svg.selectAll('*').remove();
        };
    }
}, [treeData, treeTheme]);

  useEffect(() => {
    function handleResize() {
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    }

    // After the initial render, the window size will be measured and stored in state
    handleResize();

    // The event listener ensures that the state is updated whenever the window is resized
    window.addEventListener('resize', handleResize);
    // cleanup this component
    return () => window.removeEventListener('resize', handleResize);
}, []); 


  return (
  <div>
      <svg
  className="d3-component"
  width={'100vw'}
  height={'92vh'}
  style={{backgroundColor: treeTheme.background}}
  ref={d3Container}
/>;
<div id="tooltip" style={{position: 'absolute', opacity: 1, backgroundColor: 'white', zIndex: 1000}}>
  {/* Tooltip contents will be inserted here */}
</div>
  </div>
  )

};

export default TreeComponent;
// export {data};